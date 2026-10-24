import type { ActivityPref, Budget, Energy, Rsvp } from '../types'

export const ACTIVITY_OPTIONS: { value: ActivityPref; label: string; short: string }[] = [
  { value: 'anything', label: 'Down for anything', short: 'Anything' },
  { value: 'food', label: 'Down for food', short: 'Food' },
  { value: 'active', label: 'Something active', short: 'Active' },
  { value: 'staying-in', label: 'Staying in', short: 'Staying in' },
  { value: 'low-key', label: 'Low-key', short: 'Low-key' },
]

export const BUDGET_OPTIONS: { value: Budget; label: string; cap: number }[] = [
  { value: 'free', label: 'Free', cap: 0 },
  { value: 'under15', label: 'Under $15', cap: 15 },
  { value: 'under30', label: 'Under $30', cap: 30 },
  { value: 'any', label: 'Any', cap: Number.POSITIVE_INFINITY },
]

export const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
  { value: 'chill', label: 'Chill' },
  { value: 'social', label: 'Social' },
  { value: 'active', label: 'Active' },
]

export const activityLabel = (v: ActivityPref) => ACTIVITY_OPTIONS.find((o) => o.value === v)?.label ?? v
export const budgetLabel = (v: Budget) => BUDGET_OPTIONS.find((o) => o.value === v)?.label ?? v
export const budgetCap = (v: Budget) => BUDGET_OPTIONS.find((o) => o.value === v)?.cap ?? Number.POSITIVE_INFINITY
export const energyLabel = (v: Energy) => ENERGY_OPTIONS.find((o) => o.value === v)?.label ?? v

export const RSVP_LABELS: Record<Rsvp, string> = {
  going: 'Going',
  not_going: 'Not going',
  waiting: 'Waiting',
}
