/**
 * Activity suggestions. In this demo a deterministic, rule-based ranker stands
 * in for the AI service: it scores the curated activity list against the
 * group's preferences, budget, energy and interests.
 *
 * To connect a model later, call a server-side route that receives the same
 * input plus the curated list and returns activity ids from that list only,
 * so places and prices are never invented. The overlap time itself is always
 * computed deterministically in lib/availability.ts, not by the model.
 */
import type { Activity, ActivityPref, Budget, Energy, Status } from '../types'
import { ACTIVITIES } from '../data/activities'
import { partOfDay } from '../lib/dates'
import { activityLabel, budgetCap, budgetLabel, energyLabel } from '../lib/labels'

export const RECOMMENDER_IS_RULE_BASED = true

export interface SuggestionInput {
  start: number
  end: number
  mine: { activity: ActivityPref; budget: Budget; energy: Energy }
  /** Statuses of friends in the slot. Friends without one count as "down for anything". */
  friendStatuses: Status[]
  /** Interests of everyone in the slot, including me. */
  interests: string[][]
}

export interface RankedActivity {
  activity: Activity
  /** Duration that fits inside the shared window, in minutes. */
  minMinutes: number
  maxMinutes: number
}

export interface SuggestionResult {
  activities: RankedActivity[]
  pickedFor: string[]
  /** How many curated activities were ruled out by budget or time. */
  excluded: number
}

/** The strictest budget in the group wins. */
export function groupBudget(mine: Budget, friendStatuses: Status[]): Budget {
  return [mine, ...friendStatuses.map((s) => s.budget)].reduce((a, b) => (budgetCap(b) < budgetCap(a) ? b : a))
}

export function rankActivities(input: SuggestionInput): SuggestionResult {
  const length = input.end - input.start
  const budget = groupBudget(input.mine.budget, input.friendStatuses)
  const cap = budgetCap(budget)
  const parts = new Set([partOfDay(input.start), partOfDay(Math.max(input.start, input.end - 1))])

  const fits = ACTIVITIES.filter(
    (a) => a.costMax <= cap && a.minMinutes <= length && a.times.some((t) => parts.has(t)),
  )

  const interestCounts = new Map<string, number>()
  for (const list of input.interests) for (const i of list) interestCounts.set(i, (interestCounts.get(i) ?? 0) + 1)

  const score = (a: Activity) => {
    let s = 0
    const prefs: [ActivityPref, number][] = [
      [input.mine.activity, 3],
      ...input.friendStatuses.map((st) => [st.activity, 1] as [ActivityPref, number]),
    ]
    for (const [pref, weight] of prefs) {
      if (pref === 'anything') continue
      if (a.category.includes(pref)) s += weight
      else if (weight === 3) s -= 2
    }
    if (a.energy.includes(input.mine.energy)) s += 2
    for (const st of input.friendStatuses) if (a.energy.includes(st.energy)) s += 0.5
    for (const list of input.interests) if (list.some((i) => a.interests.includes(i))) s += 1
    if (a.costMax === 0) s += 0.25
    return s
  }

  const ranked = fits
    .map((a) => ({ a, s: score(a) }))
    .sort((x, y) => y.s - x.s || x.a.costMax - y.a.costMax || x.a.id.localeCompare(y.a.id))
    .slice(0, 3)
    .map(({ a }) => ({
      activity: a,
      minMinutes: a.minMinutes,
      maxMinutes: Math.min(a.maxMinutes, length),
    }))

  const topInterests = [...interestCounts.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, 2)
    .map(([i]) => i)

  return {
    activities: ranked,
    pickedFor: [
      activityLabel(input.mine.activity),
      budgetLabel(budget),
      `${energyLabel(input.mine.energy)} energy`,
      ...topInterests,
    ],
    excluded: ACTIVITIES.length - fits.length,
  }
}

/** Async wrapper so the UI already handles the latency of a real AI call. */
export async function suggestActivities(input: SuggestionInput): Promise<SuggestionResult> {
  await new Promise((r) => setTimeout(r, 650))
  return rankActivities(input)
}
