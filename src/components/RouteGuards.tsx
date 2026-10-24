import { Navigate, Outlet, useLocation } from 'react-router'
import { useApp } from '../state/context'
import type { OnboardingStep } from '../types'

const STEP_PATH: Record<Exclude<OnboardingStep, 'done'>, string> = {
  schedule: '/onboarding/schedule',
  review: '/onboarding/review',
  interests: '/onboarding/interests',
}

/** Main app: must be signed in and finished with onboarding. */
export function RequireOnboarded() {
  const { data } = useApp()
  const location = useLocation()
  if (!data.session) return <Navigate to="/welcome" replace state={{ from: location.pathname + location.search }} />
  if (data.onboarding !== 'done') return <Navigate to={STEP_PATH[data.onboarding]} replace />
  return <Outlet />
}

/** Onboarding steps after sign-in. */
export function RequireSession() {
  const { data } = useApp()
  if (!data.session) return <Navigate to="/welcome" replace />
  return <Outlet />
}

/** Welcome and sign-up: skip ahead if already signed in. */
export function RedirectIfSignedIn() {
  const { data } = useApp()
  if (data.session) {
    return <Navigate to={data.onboarding === 'done' ? '/' : STEP_PATH[data.onboarding]} replace />
  }
  return <Outlet />
}
