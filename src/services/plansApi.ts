/**
 * Shared plans in Supabase (`plans` + `plan_invitees`). Row-level security
 * limits every query to plans the signed-in user leads or was invited to.
 *
 * In the app, the signed-in user is always the person id 'me'; other accounts
 * use their Supabase user id. Sample friends aren't accounts yet, so they are
 * kept in the plan's `suggestion_json` as demo invitees.
 */
import type { Invitee, Person, Plan, ReminderPref, Rsvp } from '../types'
import type { Database, Json } from '../types/database.types'
import { createClient } from '../../utils/supabase/client'
import { atMinutes, minutesOfDay, toISODate } from '../lib/dates'
import { initialsOf } from '../lib/ids'

type PlanRow = Database['public']['Tables']['plans']['Row']
type DbRsvp = Database['public']['Tables']['plan_invitees']['Row']['rsvp']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Real accounts have uuid ids; sample friends have short ids like 'maya'. */
export function isAccountId(id: string): boolean {
  return UUID_RE.test(id)
}

/** What `suggestion_json` holds for a plan. */
interface PlanMeta {
  reminders: ReminderPref[]
  demoInvitees: Invitee[]
}

const toDbRsvp = (r: Rsvp): DbRsvp => (r === 'waiting' ? 'pending' : r)
const fromDbRsvp = (r: DbRsvp): Rsvp => (r === 'pending' ? 'waiting' : r)

function readMeta(json: Json | null): PlanMeta {
  const meta: PlanMeta = { reminders: [], demoInvitees: [] }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return meta
  const { reminders, demoInvitees } = json as Record<string, unknown>
  if (Array.isArray(reminders)) {
    meta.reminders = reminders.filter((r): r is ReminderPref => r === 'day_before' || r === 'two_hours_before')
  }
  if (Array.isArray(demoInvitees)) {
    for (const item of demoInvitees) {
      if (!item || typeof item !== 'object') continue
      const { personId, rsvp } = item as Record<string, unknown>
      if (typeof personId !== 'string') continue
      const valid = rsvp === 'going' || rsvp === 'not_going' || rsvp === 'waiting'
      meta.demoInvitees.push({ personId, rsvp: valid ? rsvp : 'waiting', demo: true })
    }
  }
  return meta
}

function writeMeta(plan: Pick<Plan, 'reminders' | 'invitees'>): Json {
  return {
    reminders: plan.reminders,
    demoInvitees: plan.invitees.filter((i) => i.demo).map((i) => ({ personId: i.personId, rsvp: i.rsvp })),
  }
}

function toPlan(row: PlanRow, invitees: Invitee[], myUserId: string): Plan {
  const start = new Date(row.start_at)
  const date = toISODate(start)
  const startMinutes = minutesOfDay(start)
  let endMinutes = startMinutes + 120
  if (row.end_at) {
    const end = new Date(row.end_at)
    endMinutes = toISODate(end) === date ? minutesOfDay(end) : 24 * 60
  }
  const meta = readMeta(row.suggestion_json)
  return {
    id: row.id,
    title: row.title,
    location: row.place ?? '',
    date,
    start: startMinutes,
    end: endMinutes,
    cost: row.est_cost ?? 'Not set',
    transport: row.transport,
    note: row.notes ?? '',
    leaderId: row.leader_id === myUserId ? 'me' : row.leader_id,
    invitees: [...invitees, ...meta.demoInvitees],
    activityId: row.activity_id ?? undefined,
    inviteToken: row.invite_token,
    createdAt: row.created_at,
    reminders: meta.reminders,
    shared: true,
  }
}

const PERSON_COLORS = ['#F4A792', '#A9CDEB', '#C5E3B2', '#D9C8F0', '#F7D4B5', '#F2C9DD', '#BFE0DC']

function remotePerson(id: string, displayName: string | null): Person {
  const name = displayName?.trim() || 'SBU student'
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { id, name, initials: initialsOf(name), color: PERSON_COLORS[hash % PERSON_COLORS.length], email: '', interests: [] }
}

/** All plans I lead or was invited to, plus the people in them. */
export async function fetchSharedPlans(myUserId: string): Promise<{ plans: Plan[]; people: Person[] }> {
  const client = await createClient()
  const { data: rows, error } = await client.from('plans').select('*')
  if (error) throw new Error(`Could not load plans: ${error.message}`)
  if (!rows || rows.length === 0) return { plans: [], people: [] }

  const ids = rows.map((r) => r.id)
  const [inviteesResult, peopleResult] = await Promise.all([
    client.from('plan_invitees').select('plan_id, user_id, rsvp').in('plan_id', ids),
    client.rpc('get_plan_people', { plan_ids: ids }),
  ])
  if (inviteesResult.error) throw new Error(`Could not load RSVPs: ${inviteesResult.error.message}`)
  if (peopleResult.error) throw new Error(`Could not load plan members: ${peopleResult.error.message}`)

  const byPlan = new Map<string, Invitee[]>()
  for (const i of inviteesResult.data ?? []) {
    const list = byPlan.get(i.plan_id) ?? []
    list.push({ personId: i.user_id === myUserId ? 'me' : i.user_id, rsvp: fromDbRsvp(i.rsvp) })
    byPlan.set(i.plan_id, list)
  }

  const people = new Map<string, Person>()
  for (const p of peopleResult.data ?? []) {
    if (p.user_id !== myUserId) people.set(p.user_id, remotePerson(p.user_id, p.display_name))
  }

  return {
    plans: rows.map((row) => toPlan(row, byPlan.get(row.id) ?? [], myUserId)),
    people: [...people.values()],
  }
}

export type NewPlan = Omit<Plan, 'id' | 'inviteToken' | 'createdAt' | 'leaderId' | 'shared'>

/** Create a plan led by me. Real accounts become invitees; sample friends are stored as demo invitees. */
export async function createSharedPlan(myUserId: string, input: NewPlan): Promise<Plan> {
  const client = await createClient()
  const invitees: Invitee[] = input.invitees.map((i) => (isAccountId(i.personId) ? i : { ...i, demo: true }))
  const { data: row, error } = await client
    .from('plans')
    .insert({
      leader_id: myUserId,
      title: input.title,
      place: input.location,
      start_at: atMinutes(input.date, input.start).toISOString(),
      end_at: atMinutes(input.date, input.end).toISOString(),
      est_cost: input.cost,
      transport: input.transport,
      notes: input.note || null,
      activity_id: input.activityId ?? null,
      suggestion_json: writeMeta({ reminders: input.reminders, invitees }),
    })
    .select()
    .single()
  if (error) throw new Error(`Could not create the plan: ${error.message}`)

  const real = invitees.filter((i) => !i.demo)
  if (real.length > 0) {
    const { error: inviteError } = await client
      .from('plan_invitees')
      .insert(real.map((i) => ({ plan_id: row.id, user_id: i.personId, rsvp: toDbRsvp(i.rsvp) })))
    if (inviteError) throw new Error(`The plan was created, but inviting friends failed: ${inviteError.message}`)
  }
  return toPlan(row, real, myUserId)
}

export async function updateMyRsvp(myUserId: string, planId: string, rsvp: Rsvp): Promise<void> {
  const client = await createClient()
  const { data, error } = await client
    .from('plan_invitees')
    .update({ rsvp: toDbRsvp(rsvp) })
    .eq('plan_id', planId)
    .eq('user_id', myUserId)
    .select('plan_id')
  if (error) throw new Error(`Could not save your RSVP: ${error.message}`)
  if (!data || data.length === 0) throw new Error("Could not save your RSVP: you're not on this plan's invite list.")
}

/** Leader only: save demo invitees' RSVPs (used by "Simulate friends' replies"). */
export async function updateDemoInvitees(plan: Plan): Promise<void> {
  const client = await createClient()
  const { error } = await client.from('plans').update({ suggestion_json: writeMeta(plan) }).eq('id', plan.id)
  if (error) throw new Error(`Could not save replies: ${error.message}`)
}

/** Add me to a plan from its invite link. Returns the plan id. */
export async function joinPlanByToken(token: string): Promise<string> {
  if (!isAccountId(token)) throw new Error('This invite link is not valid.')
  const client = await createClient()
  const { data, error } = await client.rpc('join_plan_by_token', { token })
  if (error) throw new Error(error.message === 'Invalid invite' ? 'This invite link is not valid.' : error.message)
  return data
}

/** Keep my profile name in sync so other plan members see it, not my NetID. */
export async function syncDisplayName(myUserId: string, name: string): Promise<void> {
  const client = await createClient()
  const { error } = await client.from('profiles').update({ display_name: name }).eq('id', myUserId)
  if (error) throw new Error(`Could not update your display name: ${error.message}`)
}
