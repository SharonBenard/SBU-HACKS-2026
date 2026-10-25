/**
 * Server-side AI activity suggestions. Runs in the Vercel function
 * (api/suggest.ts) and in the Vite dev server (vite.config.ts) - never in the
 * browser, so ANTHROPIC_API_KEY is never shipped to students' phones.
 *
 * The app decides who is free and which activities fit the time and budget.
 * Claude only chooses and explains, and only from that shortlist of curated
 * activity ids, so it can't invent places or prices.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { ACTIVITIES } from '../src/data/activities.js'

export interface SuggestEnv {
  anthropicApiKey?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  /** Let signed-out (demo mode) visitors use the AI. Off by default so strangers can't spend the key. */
  allowAnonymous?: boolean
}

export interface SuggestResult {
  status: number
  body: unknown
}

/** One person in the shared slot. No names or emails are sent to the model. */
interface PersonContext {
  interests: string[]
  /** Set when they shared a status; otherwise they're only free per their schedule. */
  status?: { activity: string; budget: string; energy: string; note?: string }
}

interface SuggestRequest {
  /** "Thursday, October 29" */
  day: string
  /** "6 – 9 PM" */
  time: string
  minutes: number
  partOfDay: string
  budget: string
  me: PersonContext & { energy: string; commuter: boolean }
  friends: PersonContext[]
  /** Curated activity ids that already fit the time, budget and time of day. */
  candidateIds: string[]
}

const MAX_FRIENDS = 20
const MAX_CANDIDATES = 14

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      description: 'Up to 3 different activities from the candidates, best first.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'A candidate activity id, copied exactly.' },
          why: { type: 'string', description: 'One sentence, under 20 words, on why it fits this group.' },
        },
        required: ['id', 'why'],
        additionalProperties: false,
      },
    },
    groupMessage: {
      type: 'string',
      description: 'A short, friendly message to paste in the group chat proposing the top pick.',
    },
  },
  required: ['picks', 'groupMessage'],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `You help Stony Brook University students pick something to do together in a shared free window.

You get the window, each person's energy, interests and status preferences, and a shortlist of candidate activities. Every candidate already fits the group's time and budget; your job is to choose the ones this particular group will enjoy most and say why.

- Pick up to 3 different candidates, best first, using only ids from the shortlist.
- People without a status are free per their schedule but haven't said what they want; treat them as open to anything.
- Weigh shared interests, energy (chill, social, active) and stated preferences such as food, staying in or active. Prefer variety across the three picks when the group's wishes are mixed.
- Each "why" is one plain sentence under 20 words that refers to this group, not generic praise.
- The group message proposes the top pick with its time and place in one or two casual sentences, under 220 characters. Don't use names, don't promise prices, and don't add hashtags.`

function bad(message: string): SuggestResult {
  return { status: 400, body: { error: message } }
}

function asStringArray(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((v): v is string => typeof v === 'string').slice(0, max).map((v) => v.slice(0, 40))
}

function readPerson(value: unknown): PersonContext | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const interests = asStringArray(v.interests, 12) ?? []
  const s = v.status as Record<string, unknown> | undefined
  const status =
    s && typeof s === 'object'
      ? {
          activity: String(s.activity ?? 'anything').slice(0, 20),
          budget: String(s.budget ?? 'any').slice(0, 20),
          energy: String(s.energy ?? 'social').slice(0, 20),
          note: typeof s.note === 'string' ? s.note.slice(0, 80) : undefined,
        }
      : undefined
  return { interests, status }
}

function readRequest(raw: unknown): SuggestRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const me = readPerson(r.me)
  const friends = Array.isArray(r.friends) ? r.friends.slice(0, MAX_FRIENDS).map(readPerson) : null
  const candidateIds = asStringArray(r.candidateIds, MAX_CANDIDATES)
  if (!me || !friends || friends.some((f) => !f) || !candidateIds) return null
  const meRaw = r.me as Record<string, unknown>
  return {
    day: String(r.day ?? '').slice(0, 40),
    time: String(r.time ?? '').slice(0, 40),
    minutes: Math.max(0, Math.min(24 * 60, Number(r.minutes) || 0)),
    partOfDay: String(r.partOfDay ?? '').slice(0, 20),
    budget: String(r.budget ?? 'any').slice(0, 20),
    me: { ...me, energy: String(meRaw.energy ?? 'social').slice(0, 20), commuter: meRaw.commuter === true },
    friends: friends as PersonContext[],
    candidateIds,
  }
}

async function isSignedIn(authHeader: string | null, env: SuggestEnv): Promise<boolean> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !env.supabaseUrl || !env.supabaseAnonKey) return false
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  return !error && !!data.user
}

export async function handleSuggest(raw: unknown, authHeader: string | null, env: SuggestEnv): Promise<SuggestResult> {
  if (!env.anthropicApiKey) {
    return { status: 503, body: { error: 'AI suggestions are not configured. Set ANTHROPIC_API_KEY on the server.' } }
  }
  if (!env.allowAnonymous && !(await isSignedIn(authHeader, env))) {
    return { status: 401, body: { error: 'Sign in to get AI suggestions.' } }
  }

  const input = readRequest(raw)
  if (!input) return bad('Invalid suggestion request.')

  // Only curated activities, looked up here so the client can't inject places or prices.
  const candidates = input.candidateIds
    .map((id) => ACTIVITIES.find((a) => a.id === id))
    .filter((a): a is (typeof ACTIVITIES)[number] => !!a)
  if (candidates.length === 0) return bad('No candidate activities to choose from.')

  const context = {
    window: { day: input.day, time: input.time, minutes: input.minutes, partOfDay: input.partOfDay },
    groupBudget: input.budget,
    me: input.me,
    friends: input.friends.map((f, i) => ({ friend: i + 1, ...f })),
    candidates: candidates.map((a) => ({
      id: a.id,
      name: a.name,
      place: `${a.place} (${a.area})`,
      kind: a.category,
      energy: a.energy,
      interests: a.interests,
      minutes: `${a.minMinutes}-${a.maxMinutes}`,
      estimatedCost: a.costLabel,
      gettingThere: a.transport,
    })),
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey })
  let response: Anthropic.Message
  try {
    // Haiku keeps each suggestion well under a cent. It has no server-side
    // refusal fallback, so a decline is handled below like any other failure.
    response = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(context) }],
    })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { status: 429, body: { error: 'AI is busy. Try again shortly.' } }
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: 503, body: { error: 'The server has an invalid ANTHROPIC_API_KEY.' } }
    }
    if (error instanceof Anthropic.APIError) return { status: 502, body: { error: `AI request failed (${error.status}).` } }
    throw error
  }

  if (response.stop_reason === 'refusal') return { status: 502, body: { error: 'The AI declined this request.' } }
  if (response.stop_reason === 'max_tokens') return { status: 502, body: { error: 'The AI response was cut off.' } }

  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text
  let parsed: { picks?: { id?: unknown; why?: unknown }[]; groupMessage?: unknown }
  try {
    parsed = JSON.parse(text ?? '')
  } catch {
    return { status: 502, body: { error: 'The AI returned an unreadable response.' } }
  }

  // Keep only real, distinct shortlist ids.
  const allowed = new Set(candidates.map((a) => a.id))
  const seen = new Set<string>()
  const picks = (parsed.picks ?? [])
    .filter((p): p is { id: string; why: string } => typeof p.id === 'string' && typeof p.why === 'string')
    .filter((p) => allowed.has(p.id) && !seen.has(p.id) && seen.add(p.id))
    .slice(0, 3)
    .map((p) => ({ id: p.id, why: p.why.slice(0, 200) }))
  if (picks.length === 0) return { status: 502, body: { error: 'The AI did not pick any listed activity.' } }

  const groupMessage = typeof parsed.groupMessage === 'string' ? parsed.groupMessage.slice(0, 300) : ''
  return { status: 200, body: { picks, groupMessage } }
}
