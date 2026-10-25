import type { Energy, FriendRecord, Person, Plan, Rsvp, Status } from '../types'
import type { World } from './context'
import { getFriendDirectory } from '../services/friendsApi'
import { atMinutes, roundUp } from '../lib/dates'
import {
  clip,
  findAlternativeSlots,
  findBestSharedSlot,
  freeIntervals,
  overlaps,
  type AvailabilityInput,
  type Interval,
  type SharedSlot,
} from '../lib/availability'

export function isStatusActive(status: Status, now: Date): boolean {
  return atMinutes(status.date, status.end) > now
}

export function getMyStatus(w: World): Status | null {
  const s = w.data.status
  return s && isStatusActive(s, w.now) ? s : null
}

export function getPerson(w: World, id: string): Person | undefined {
  if (id === 'me') return w.data.profile ?? undefined
  return (
    getFriendDirectory().find((p) => p.id === id) ??
    w.data.remotePeople?.find((p) => p.id === id) ??
    w.data.extraPeople.find((p) => p.id === id)
  )
}

export function personName(w: World, id: string, short = false): string {
  if (id === 'me') return 'You'
  const p = getPerson(w, id)
  if (!p) return 'Unknown'
  return short ? p.name.split(' ')[0] : p.name
}

export function acceptedFriends(w: World): FriendRecord[] {
  const accepted = new Set(w.data.friendships.filter((f) => f.state === 'accepted').map((f) => f.personId))
  return getFriendDirectory().filter((p) => accepted.has(p.id) && !w.data.blocked.includes(p.id))
}

export function friendStatus(w: World, id: string): Status | undefined {
  if (w.data.blocked.includes(id)) return undefined
  return w.friendStatuses.find((s) => s.personId === id)
}

export function currentEnergy(w: World): Energy | undefined {
  const e = w.data.profile?.energy
  return e && e.date === w.today ? e.level : undefined
}

export function isMine(plan: Plan): boolean {
  return plan.leaderId === 'me' || plan.invitees.some((i) => i.personId === 'me')
}

/** The leader's own RSVP is implicitly "going". */
export function rsvpOf(plan: Plan, personId: string): Rsvp | undefined {
  if (plan.leaderId === personId) return 'going'
  return plan.invitees.find((i) => i.personId === personId)?.rsvp
}

export function isPlanUpcoming(plan: Plan, now: Date): boolean {
  return atMinutes(plan.date, plan.end) > now
}

export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
}

export function myAvailability(w: World): AvailabilityInput {
  return {
    id: 'me',
    schedule: w.data.schedule?.blocks ?? [],
    extraBusy: w.data.plans
      .filter((p) => isMine(p) && rsvpOf(p, 'me') === 'going')
      .map((p) => ({ date: p.date, start: p.start, end: p.end })),
    status: getMyStatus(w),
  }
}

export function friendAvailability(w: World, friend: FriendRecord): AvailabilityInput {
  return { id: friend.id, schedule: friend.schedule, status: friendStatus(w, friend.id) ?? null }
}

/** The part of a status window still ahead of us. */
export function remainingWindow(w: World, status: Pick<Status, 'date' | 'start' | 'end'>): Interval | null {
  if (status.date < w.today) return null
  if (status.date > w.today) return [status.start, status.end]
  const window = clip([status.start, status.end], [roundUp(w.nowMinutes, 15), 24 * 60])
  return window && window[1] - window[0] >= 30 ? window : null
}

export interface MatchFriend {
  friend: FriendRecord
  status?: Status
  /** 'status': they set "down to hang". 'schedule': only free per their schedule. */
  kind: 'status' | 'schedule'
}

export interface StatusMatch {
  status: Status
  slot: SharedSlot | null
  friends: MatchFriend[]
}

/** Deterministic overlap between my status window and my friends' free time. */
export function computeMatch(w: World, status: Status): StatusMatch {
  const window = remainingWindow(w, status)
  if (!window) return { status, slot: null, friends: [] }
  const friends = acceptedFriends(w)
  const slot = findBestSharedSlot(
    status.date,
    window,
    friends.map((f) => ({ id: f.id, free: freeIntervals(friendAvailability(w, f), status.date, window) })),
  )
  if (!slot) return { status, slot: null, friends: [] }
  const matchFriends = slot.personIds.map((id) => {
    const friend = friends.find((f) => f.id === id)!
    const st = friendStatus(w, id)
    const inSlot = st && st.date === slot.date && overlaps([st.start, st.end], [slot.start, slot.end])
    return { friend, status: inSlot ? st : undefined, kind: inSlot ? 'status' : 'schedule' } as MatchFriend
  })
  matchFriends.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'status' ? -1 : 1))
  return { status, slot, friends: matchFriends }
}

export function alternativeSlots(w: World, exclude?: { date: string; start: number; end: number } | null) {
  return findAlternativeSlots({
    today: w.today,
    nowMinutes: roundUp(w.nowMinutes, 15),
    me: myAvailability(w),
    friends: acceptedFriends(w).map((f) => friendAvailability(w, f)),
    exclude,
  })
}

/** Which accepted friends are free for a whole time range. */
export function friendsFreeFor(w: World, date: string, start: number, end: number): Set<string> {
  return new Set(
    acceptedFriends(w)
      .filter((f) => {
        const free = freeIntervals(friendAvailability(w, f), date, [start, end])
        return free.some(([s, e]) => s <= start && e >= end)
      })
      .map((f) => f.id),
  )
}
