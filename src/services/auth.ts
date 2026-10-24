import { isSbuEmail } from '../lib/ids'
import { createClient } from '../../utils/supabase/client'

export type SignInResult = { ok: true; email: string } | { ok: false; error: string }

export function validateSignUp(name: string, email: string): { name?: string; email?: string } {
  const errors: { name?: string; email?: string } = {}
  if (!name.trim()) errors.name = 'Enter your name so friends recognize you.'
  if (!email.trim()) errors.email = 'Enter your SBU email.'
  else if (!isSbuEmail(email)) errors.email = 'Use your @stonybrook.edu email. Only SBU students can join.'
  return errors
}

export async function requestSignInLink(email: string, name: string): Promise<SignInResult> {
  const normalized = email.trim().toLowerCase()
  if (!isSbuEmail(normalized)) return { ok: false, error: 'Only @stonybrook.edu addresses can join.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: { display_name: name.trim() },
    },
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, email: normalized }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Could not sign out: ${error.message}`)
}
