/**
 * Activity suggestions.
 *
 * 1. A deterministic ranker filters the curated list to activities that fit the
 *    window's length, time of day and the group's strictest budget, and scores
 *    them against preferences, energy and interests.
 * 2. The best-scoring candidates go to the server route /api/suggest, where
 *    Claude picks and explains up to three of them (server/suggest.ts).
 * 3. If the AI route is unavailable (not configured, signed out, offline,
 *    error), the rule-based top three are shown instead.
 *
 * Who is free, and when, is always computed in lib/availability.ts, never by AI.
 */
import type { Activity, ActivityPref, Budget, Energy, Status } from '../types'
import { ACTIVITIES } from '../data/activities'
import { formatDayLong, formatRange, partOfDay } from '../lib/dates'
import { activityLabel, budgetCap, budgetLabel, energyLabel } from '../lib/labels'
import { createClient } from '../../utils/supabase/client'

export interface SuggestionInput {
  date: string
  start: number
  end: number
  mine: { activity: ActivityPref; budget: Budget; energy: Energy }
  myInterests: string[]
  commuter: boolean
  /** Friends in the slot. Those without a status are free per schedule and count as "down for anything". */
  friends: { interests: string[]; status?: Status }[]
}

export interface RankedActivity {
  activity: Activity
  /** Duration that fits inside the shared window, in minutes. */
  minMinutes: number
  maxMinutes: number
  /** The AI's one-line reason this fits the group. */
  why?: string
}

export interface SuggestionResult {
  activities: RankedActivity[]
  pickedFor: string[]
  /** How many curated activities were ruled out by budget or time. */
  excluded: number
  /** 'ai' when Claude chose the activities, 'rules' when the deterministic ranker did. */
  source: 'ai' | 'rules'
  /** A message to paste in the group chat (AI only). */
  groupMessage?: string
  /** Why the rule-based picks are shown instead of AI picks. */
  fallbackReason?: string
}

/** How many ranked candidates the AI gets to choose from. */
const AI_CANDIDATES = 8

/** The strictest budget in the group wins. */
export function groupBudget(mine: Budget, friendStatuses: Status[]): Budget {
  return [mine, ...friendStatuses.map((s) => s.budget)].reduce((a, b) => (budgetCap(b) < budgetCap(a) ? b : a))
}

function friendStatusesOf(input: SuggestionInput): Status[] {
  return input.friends.flatMap((f) => (f.status ? [f.status] : []))
}

/** Every curated activity that fits the window and budget, best first. */
function rankAll(input: SuggestionInput): { ranked: Activity[]; budget: Budget } {
  const length = input.end - input.start
  const friendStatuses = friendStatusesOf(input)
  const interests = [input.myInterests, ...input.friends.map((f) => f.interests)]
  const budget = groupBudget(input.mine.budget, friendStatuses)
  const cap = budgetCap(budget)
  const parts = new Set([partOfDay(input.start), partOfDay(Math.max(input.start, input.end - 1))])

  const fits = ACTIVITIES.filter(
    (a) => a.costMax <= cap && a.minMinutes <= length && a.times.some((t) => parts.has(t)),
  )

  const score = (a: Activity) => {
    let s = 0
    const prefs: [ActivityPref, number][] = [
      [input.mine.activity, 3],
      ...friendStatuses.map((st) => [st.activity, 1] as [ActivityPref, number]),
    ]
    for (const [pref, weight] of prefs) {
      if (pref === 'anything') continue
      if (a.category.includes(pref)) s += weight
      else if (weight === 3) s -= 2
    }
    if (a.energy.includes(input.mine.energy)) s += 2
    for (const st of friendStatuses) if (a.energy.includes(st.energy)) s += 0.5
    for (const list of interests) if (list.some((i) => a.interests.includes(i))) s += 1
    if (a.costMax === 0) s += 0.25
    return s
  }

  const ranked = fits
    .map((a) => ({ a, s: score(a) }))
    .sort((x, y) => y.s - x.s || x.a.costMax - y.a.costMax || x.a.id.localeCompare(y.a.id))
    .map(({ a }) => a)
  return { ranked, budget }
}

function toRanked(a: Activity, input: SuggestionInput, why?: string): RankedActivity {
  return { activity: a, minMinutes: a.minMinutes, maxMinutes: Math.min(a.maxMinutes, input.end - input.start), why }
}

export function rankActivities(input: SuggestionInput): SuggestionResult {
  const { ranked, budget } = rankAll(input)
  const interestCounts = new Map<string, number>()
  for (const list of [input.myInterests, ...input.friends.map((f) => f.interests)]) {
    for (const i of list) interestCounts.set(i, (interestCounts.get(i) ?? 0) + 1)
  }
  const topInterests = [...interestCounts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 2)
    .map(([i]) => i)

  return {
    activities: ranked.slice(0, 3).map((a) => toRanked(a, input)),
    pickedFor: [
      activityLabel(input.mine.activity),
      budgetLabel(budget),
      `${energyLabel(input.mine.energy)} energy`,
      ...topInterests,
    ],
    excluded: ACTIVITIES.length - ranked.length,
    source: 'rules',
  }
}

async function accessToken(): Promise<string | null> {
  try {
    const client = await createClient()
    const { data } = await client.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

/** AI picks from the curated shortlist, falling back to the rule-based ranking. */
export async function suggestActivities(input: SuggestionInput): Promise<SuggestionResult> {
  const rules = rankActivities(input)
  const { ranked, budget } = rankAll(input)
  if (ranked.length === 0) return rules

  const shortlist = ranked.slice(0, AI_CANDIDATES)
  const token = await accessToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch('/api/suggest', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        day: formatDayLong(input.date),
        time: formatRange(input.start, input.end),
        minutes: input.end - input.start,
        partOfDay: partOfDay(input.start),
        budget,
        me: { interests: input.myInterests, energy: input.mine.energy, commuter: input.commuter, status: input.mine },
        friends: input.friends.map((f) => ({
          interests: f.interests,
          status: f.status
            ? { activity: f.status.activity, budget: f.status.budget, energy: f.status.energy, note: f.status.note }
            : undefined,
        })),
        candidateIds: shortlist.map((a) => a.id),
      }),
    })
    const body = (await response.json().catch(() => null)) as
      | { picks?: { id: string; why: string }[]; groupMessage?: string; error?: string }
      | null
    if (!response.ok || !body?.picks) {
      return { ...rules, fallbackReason: body?.error ?? `AI suggestions are unavailable (${response.status}).` }
    }
    const activities = body.picks.flatMap((p) => {
      const a = shortlist.find((x) => x.id === p.id)
      return a ? [toRanked(a, input, p.why)] : []
    })
    if (activities.length === 0) return { ...rules, fallbackReason: 'The AI picks could not be matched.' }
    return { ...rules, activities, source: 'ai', groupMessage: body.groupMessage || undefined }
  } catch {
    return { ...rules, fallbackReason: 'Could not reach AI suggestions. Check your connection.' }
  } finally {
    clearTimeout(timer)
  }
}
