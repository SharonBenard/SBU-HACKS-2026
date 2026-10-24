import type { Plan } from '../types'
import { formatRange, relativeDayLong } from './dates'

/** "Tomorrow, 6 – 9 PM" or "Thu, Oct 29, 6 – 9 PM" */
export function planWhen(plan: Pick<Plan, 'date' | 'start' | 'end'>, today: string): string {
  return `${relativeDayLong(plan.date, today)}, ${formatRange(plan.start, plan.end)}`
}

export function inviteUrl(plan: Pick<Plan, 'id' | 'inviteToken'>): string {
  return `${window.location.origin}/plan/${plan.id}?invite=${plan.inviteToken}`
}
