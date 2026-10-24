import type { Status } from '../types'
import { formatRange, formatTime, formatTimeFull, relativeDay, relativeDayLong } from './dates'
import { activityLabel, budgetLabel, energyLabel } from './labels'

export function isNow(status: Pick<Status, 'date' | 'start'>, today: string, nowMinutes: number): boolean {
  return status.date === today && status.start <= nowMinutes
}

/** "Free now until 3 PM", "Free today 6 – 9 PM", "Free Thu 6 – 9 PM" */
export function statusHeadline(status: Status, today: string, nowMinutes: number): string {
  if (isNow(status, today, nowMinutes)) return `Free now until ${formatTime(status.end)}`
  const day = status.date === today ? 'today' : relativeDay(status.date, today)
  return `Free ${day} ${formatRange(status.start, status.end)}`
}

export function statusPrefs(status: Status): string {
  return `${activityLabel(status.activity)} · ${budgetLabel(status.budget)} · ${energyLabel(status.energy)} energy`
}

/** "disappears 3:00 PM today" */
export function statusExpiry(status: Status, today: string): string {
  const day = status.date === today ? 'today' : relativeDayLong(status.date, today)
  return `disappears ${formatTimeFull(status.end)} ${day === 'Tomorrow' ? 'tomorrow' : day}`
}

/** Short label under a story avatar: "now", "Tonight", "Thu" */
export function storyWhen(status: Status, today: string, nowMinutes: number): string {
  if (isNow(status, today, nowMinutes)) return 'now'
  if (status.date === today) return status.start >= 17 * 60 ? 'tonight' : formatTime(status.start)
  return relativeDay(status.date, today)
}
