import type { DayIndex, TimeOfDay } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Monday = 0 … Sunday = 6 */
export function weekdayIndex(iso: string): DayIndex {
  return ((parseISODate(iso).getDay() + 6) % 7) as DayIndex
}

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const DAY_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Combine a date and minutes-since-midnight into a Date. */
export function atMinutes(iso: string, minutes: number): Date {
  const d = parseISODate(iso)
  d.setMinutes(minutes)
  return d
}

/** "Thu, Oct 29" */
export function formatDayShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "Thursday, October 29" */
export function formatDayLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** "Today", "Tomorrow" or "Thu" */
export function relativeDay(iso: string, today: string): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return DAY_SHORT[weekdayIndex(iso)]
}

/** "Today", "Tomorrow" or "Thu, Oct 29" */
export function relativeDayLong(iso: string, today: string): string {
  if (iso === today) return 'Today'
  if (iso === addDays(today, 1)) return 'Tomorrow'
  return formatDayShort(iso)
}

function clock(minutes: number, withMeridiem: boolean, forceMinutes: boolean): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mm = m % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const mer = h24 < 12 ? 'AM' : 'PM'
  const body = mm === 0 && !forceMinutes ? `${h12}` : `${h12}:${pad(mm)}`
  return withMeridiem ? `${body} ${mer}` : body
}

/** "6 PM", "6:30 PM" */
export function formatTime(minutes: number): string {
  return clock(minutes, true, false)
}

/** "6:00 PM" */
export function formatTimeFull(minutes: number): string {
  return clock(minutes, true, true)
}

/** "6 – 9 PM", "10 AM – 12 PM", "1:30 – 3 PM" */
export function formatRange(start: number, end: number): string {
  const sameMeridiem = end < 1440 && (start < 720) === (end < 720)
  if (sameMeridiem) return `${clock(start, false, false)} – ${clock(end, true, false)}`
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** "9a", "12p" for compact grid labels */
export function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'a' : 'p'}`
}

/** "HH:MM" for <input type="time"> */
export function toTimeInput(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function fromTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes >= 0 && minutes <= 1440 ? minutes : null
}

export function roundUp(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step
}

export function partOfDay(minutes: number): TimeOfDay {
  if (minutes < 12 * 60) return 'morning'
  if (minutes < 17 * 60) return 'afternoon'
  return 'evening'
}

/** "2 hrs", "90 min", "2–2.5 hrs" */
export function formatDuration(minMinutes: number, maxMinutes: number): string {
  const one = (m: number) => (m < 60 ? `${m} min` : `${+(m / 60).toFixed(1)}`)
  if (maxMinutes <= 60) return minMinutes === maxMinutes ? `${maxMinutes} min` : `${minMinutes}–${maxMinutes} min`
  if (minMinutes < 60) return `${minMinutes} min – ${one(maxMinutes)} hrs`
  if (minMinutes === maxMinutes) return `${one(maxMinutes)} ${maxMinutes === 60 ? 'hr' : 'hrs'}`
  return `${one(minMinutes)}–${one(maxMinutes)} hrs`
}
