import type { Plan, Rsvp } from '../types'
import { useApp, useToast } from './context'

export function useRsvp() {
  const { dispatch } = useApp()
  const toast = useToast()
  return (plan: Plan, rsvp: Rsvp) => {
    dispatch({ type: 'rsvp', planId: plan.id, personId: 'me', rsvp })
    toast.show(rsvp === 'going' ? `You're going to ${plan.title}.` : `RSVP updated: not going to ${plan.title}.`)
  }
}
