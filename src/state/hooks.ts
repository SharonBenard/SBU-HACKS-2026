import type { Plan, Rsvp } from '../types'
import { useApp, useToast } from './context'
import { rsvpOf } from './selectors'
import { updateMyRsvp } from '../services/plansApi'

export function useRsvp() {
  const { dispatch, userId } = useApp()
  const toast = useToast()
  return async (plan: Plan, rsvp: Rsvp) => {
    const previous = rsvpOf(plan, 'me') ?? 'waiting'
    dispatch({ type: 'rsvp', planId: plan.id, personId: 'me', rsvp })
    if (plan.shared) {
      try {
        if (!userId) throw new Error('Sign in again to RSVP.')
        await updateMyRsvp(userId, plan.id, rsvp)
      } catch (error) {
        dispatch({ type: 'rsvp', planId: plan.id, personId: 'me', rsvp: previous })
        toast.show(error instanceof Error ? error.message : "Couldn't save your RSVP. Try again.")
        return
      }
    }
    toast.show(rsvp === 'going' ? `You're going to ${plan.title}.` : `RSVP updated: not going to ${plan.title}.`)
  }
}
