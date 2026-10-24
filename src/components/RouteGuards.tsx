import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useApp } from '../state/context'
import { rememberReturnTo } from '../lib/returnTo'
import type { OnboardingStep } from '../types'

const STEP_PATH: Record<Exclude<OnboardingStep, 'done'>, string> = {
  schedule: '/onboarding/schedule',
  review: '/onboarding/review',
  interests: '/onboarding/interests',
}

/** Main app: must be signed in and finished with onboarding. */
export function RequireOnboarded() {
  const { data, authLoading } = useApp()
  const location = useLocation()
  const from = location.pathname + location.search
  if (authLoading) return <p role="status">Connecting to Supabase…</p>
  if (!data.session) return <RedirectRemembering to="/welcome" from={from} />
  if (data.onboarding !== 'done') return <RedirectRemembering to={STEP_PATH[data.onboarding]} from={from} />
  return <Outlet />
}

/** Redirect, remembering invite links so sign-in and onboarding can return to them. */
function RedirectRemembering({ to, from }: { to: string; from: string }) {
  useEffect(() => {
    if (from.startsWith('/plan/')) rememberReturnTo(from)
  }, [from])
  return <Navigate to={to} replace />
}

/** Onboarding steps after sign-in. */
export function RequireSession() {
  const { data, authLoading } = useApp()
  if (authLoading) return <p role="status">Connecting to Supabase…</p>
  if (!data.session) return <Navigate to="/welcome" replace />
  return <Outlet />
}

/** Welcome and sign-up: skip ahead if already signed in. */
export function RedirectIfSignedIn() {
  const { data, authLoading } = useApp()
  if (authLoading) return <p role="status">Connecting to Supabase…</p>
  if (data.session) {
    return <Navigate to={data.onboarding === 'done' ? '/' : STEP_PATH[data.onboarding]} replace />
  }
  return <Outlet />
}
