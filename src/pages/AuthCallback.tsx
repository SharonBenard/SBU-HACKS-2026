import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createClient } from '../../utils/supabase/client'
import { useApp } from '../state/context'

/**
 * A sign-in code can only be exchanged once: the first exchange consumes the
 * PKCE verifier. React StrictMode runs effects twice in development, so share
 * one exchange per code. Resolves to an error message, or null on success.
 */
const exchanges = new Map<string, Promise<string | null>>()

function exchangeOnce(code: string): Promise<string | null> {
  let pending = exchanges.get(code)
  if (!pending) {
    pending = createClient()
      .then((client) => client.auth.exchangeCodeForSession(code))
      .then(({ error }) => (error ? error.message : null))
      .catch((error: unknown) => (error instanceof Error ? error.message : 'Could not complete sign-in.'))
    exchanges.set(code, pending)
  }
  return pending
}

export function AuthCallback() {
  const { authLoading, authError, data } = useApp()
  const navigate = useNavigate()
  const [exchangeComplete, setExchangeComplete] = useState(false)
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).has('code')
      ? null
      : 'This sign-in link is missing its code. Request a new link and try again.',
  )

  useEffect(() => {
    let active = true
    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) return

    void exchangeOnce(code).then((exchangeError) => {
      if (!active) return
      if (exchangeError) setError(exchangeError)
      else setExchangeComplete(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!exchangeComplete || authLoading || !data.session) return
    const destination =
      data.onboarding === 'done' ? '/' : `/onboarding/${data.onboarding}`
    navigate(destination, { replace: true })
  }, [exchangeComplete, authLoading, data.session, data.onboarding, navigate])

  if (error || authError) {
    return (
      <main className="page">
        <div className="card stack">
          <h1>Sign-in link could not be used</h1>
          <p role="alert">{error ?? authError}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/signup', { replace: true })}>
            Request a new link
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="card">
        <p role="status">Verifying your SBU email…</p>
      </div>
    </main>
  )
}
