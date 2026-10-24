/**
 * DEMO notifications. Nothing is delivered: invitations exist only in this
 * browser's saved data, and reminders are stored as preferences only.
 *
 * Replace with real email/push delivery from a server once a backend exists.
 */
import type { Plan } from '../types'

export const NOTIFICATIONS_ARE_DEMO = true

export interface DeliveryResult {
  delivered: boolean
  detail: string
}

export async function sendPlanInvites(plan: Plan): Promise<DeliveryResult> {
  await new Promise((r) => setTimeout(r, 400))
  return {
    delivered: false,
    detail: `${plan.invitees.length} invitation${plan.invitees.length === 1 ? '' : 's'} saved in this demo. No email or push notification was sent.`,
  }
}

export function reminderDescription(plan: Plan): string {
  const parts = plan.reminders.map((r) => (r === 'day_before' ? 'the day before' : '2 hours before'))
  if (parts.length === 0) return 'No reminders.'
  const text = parts.join(', and ')
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}
