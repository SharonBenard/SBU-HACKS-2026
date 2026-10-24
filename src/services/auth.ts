/**
 * DEMO authentication. No email is sent and nothing is verified.
 *
 * Replace with a real magic-link provider (for example Supabase Auth). The
 * @stonybrook.edu check below is UI-only; production must enforce it on the
 * server or in a database rule as well.
 */
import type { Session } from '../types'
import { isSbuEmail } from '../lib/ids'

export const AUTH_IS_DEMO = true

export type SignInResult = { ok: true; email: string } | { ok: false; error: string }

export function validateSignUp(name: string, email: string): { name?: string; email?: string } {
  const errors: { name?: string; email?: string } = {}
  if (!name.trim()) errors.name = 'Enter your name so friends recognize you.'
  if (!email.trim()) errors.email = 'Enter your SBU email.'
  else if (!isSbuEmail(email)) errors.email = 'Use your @stonybrook.edu email. Only SBU students can join.'
  return errors
}

export async function requestSignInLink(email: string): Promise<SignInResult> {
  await new Promise((r) => setTimeout(r, 700))
  const normalized = email.trim().toLowerCase()
  if (!isSbuEmail(normalized)) return { ok: false, error: 'Only @stonybrook.edu addresses can join.' }
  return { ok: true, email: normalized }
}

/** In the demo there is no link to click; this stands in for the callback. */
export function completeDemoSignIn(email: string): Session {
  return { email, verified: true, demo: true }
}
