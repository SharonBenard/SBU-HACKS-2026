/**
 * Deterministic free-time math. No AI is involved in deciding who is free:
 * everything here is plain interval arithmetic over weekly busy blocks,
 * statuses and confirmed plans. Times are minutes since midnight.
 */
import type { BusyBlock, Status } from '../types'
import { addDays, weekdayIndex } from './dates'

export type Interval = [number, number]

/** The window the app plans within each day (7 AM – midnight). */
export const DAY_WINDOW: Interval = [7 * 60, 24 * 60]

export const PRESET_WINDOWS = {
  morning: { label: 'Morning', range: [10 * 60, 12 * 60] as Interval },
  afternoon: { label: 'Afternoon', range: [13 * 60, 16 * 60] as Interval },
  evening: { label: 'Evening', range: [18 * 60, 21 * 60] as Interval },
} as const

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
  const out: Interval[] = []
  for (const [s, e] of sorted) {
    const last = out[out.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else out.push([s, e])
  }
  return out
}

export function subtractIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let pieces: Interval[] = [base]
  for (const [cs, ce] of cuts) {
    const next: Interval[] = []
    for (const [s, e] of pieces) {
      if (ce <= s || cs >= e) {
        next.push([s, e])
        continue
      }
      if (cs > s) next.push([s, cs])
      if (ce < e) next.push([ce, e])
    }
    pieces = next
  }
  return pieces.filter(([s, e]) => e > s)
}

export function clip([s, e]: Interval, [ws, we]: Interval): Interval | null {
  const start = Math.max(s, ws)
  const end = Math.min(e, we)
  return end > start ? [start, end] : null
}

export function covers(intervals: Interval[], start: number, end: number): boolean {
  return intervals.some(([s, e]) => s <= start && e >= end)
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

/** Busy intervals on a given date from a recurring weekly schedule. */
export function busyOnDate(blocks: BusyBlock[], iso: string): Interval[] {
  const day = weekdayIndex(iso)
  return blocks.filter((b) => b.day === day).map((b) => [b.start, b.end] as Interval)
}

export interface AvailabilityInput {
  id: string
  schedule: BusyBlock[]
  /** One-off busy times on specific dates (for example, plans they're going to). */
  extraBusy?: { date: string; start: number; end: number }[]
  /** An active status. Saying "I'm free" overrides the schedule for that window. */
  status?: Status | null
}

/** Free intervals for one person within a window on a date. */
export function freeIntervals(person: AvailabilityInput, iso: string, window: Interval): Interval[] {
  const busy = [
    ...busyOnDate(person.schedule, iso),
    ...(person.extraBusy ?? []).filter((b) => b.date === iso).map((b) => [b.start, b.end] as Interval),
  ]
  const free = subtractIntervals(window, busy)
  const status = person.status
  if (status && status.date === iso) {
    const s = clip([status.start, status.end], window)
    if (s) free.push(s)
  }
  return mergeIntervals(free)
}

export function isFree(person: AvailabilityInput, iso: string, start: number, end: number): boolean {
  return covers(freeIntervals(person, iso, [start, end]), start, end)
}

export interface SharedSlot {
  date: string
  start: number
  end: number
  /** Friends free for the whole slot. */
  personIds: string[]
}

/**
 * Within `window` (when I'm free), find the slot with the most friends free for
 * the whole slot. Ties go to the longer slot, then the earlier one. A slot must
 * last at least `minMinutes` (or the whole window, if the window is shorter).
 */
export function findBestSharedSlot(
  iso: string,
  window: Interval,
  friends: { id: string; free: Interval[] }[],
  minMinutes = 60,
): SharedSlot | null {
  const [ws, we] = window
  if (we <= ws) return null
  const minLen = Math.min(minMinutes, we - ws)
  const points = new Set<number>([ws, we])
  for (const f of friends) {
    for (const [s, e] of f.free) {
      if (s > ws && s < we) points.add(s)
      if (e > ws && e < we) points.add(e)
    }
  }
  const sorted = [...points].sort((a, b) => a - b)

  let best: SharedSlot | null = null
  for (let i = 0; i < sorted.length; i++) {
    for (let j = sorted.length - 1; j > i; j--) {
      const start = sorted[i]
      const end = sorted[j]
      if (end - start < minLen) break
      const ids = friends.filter((f) => covers(f.free, start, end)).map((f) => f.id)
      if (ids.length === 0) continue
      const better =
        !best ||
        ids.length > best.personIds.length ||
        (ids.length === best.personIds.length && end - start > best.end - best.start)
      if (better) best = { date: iso, start, end, personIds: ids }
    }
  }
  return best
}

/**
 * Suggest other times that work, scanning the next `days` days in
 * morning / afternoon / evening windows where I'm free.
 */
export function findAlternativeSlots(options: {
  today: string
  nowMinutes: number
  me: AvailabilityInput
  friends: AvailabilityInput[]
  exclude?: { date: string; start: number; end: number } | null
  days?: number
  limit?: number
}): SharedSlot[] {
  const { today, nowMinutes, me, friends, exclude, days = 7, limit = 3 } = options
  const meNoStatus = { ...me, status: null }
  const found: SharedSlot[] = []
  for (let d = 0; d < days; d++) {
    const iso = addDays(today, d)
    for (const preset of Object.values(PRESET_WINDOWS)) {
      let window: Interval | null = [...preset.range]
      if (iso === today) window = clip(window, [nowMinutes, 24 * 60])
      if (!window) continue
      for (const mine of freeIntervals(meNoStatus, iso, window)) {
        const slot = findBestSharedSlot(
          iso,
          mine,
          friends.map((f) => ({ id: f.id, free: freeIntervals(f, iso, mine) })),
        )
        if (!slot || slot.end - slot.start < 60) continue
        if (exclude && exclude.date === iso && overlaps([slot.start, slot.end], [exclude.start, exclude.end])) continue
        found.push(slot)
      }
    }
  }
  const order = (s: SharedSlot) => `${s.date}-${String(s.start).padStart(4, '0')}`
  return found
    .sort((a, b) => b.personIds.length - a.personIds.length || order(a).localeCompare(order(b)))
    .slice(0, limit)
    .sort((a, b) => order(a).localeCompare(order(b)))
}

/** How many of `people` are free for the whole hour starting at `hour` on `iso`. */
export function freeAtHour(people: AvailabilityInput[], iso: string, hour: number): string[] {
  const start = hour * 60
  return people.filter((p) => isFree(p, iso, start, start + 60)).map((p) => p.id)
}
