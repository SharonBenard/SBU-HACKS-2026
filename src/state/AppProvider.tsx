import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { AppContext, ToastContext, useApp, type AppContextValue } from './context'
import { initialData, reducer } from './reducer'
import { loadAccountData, saveAccountData } from '../services/accountData'
import { getFriendStatuses } from '../services/friendsApi'
import { fetchSharedPlans, syncDisplayName } from '../services/plansApi'
import { minutesOfDay, toISODate } from '../lib/dates'
import { isStatusActive } from './selectors'
import { initialsOf } from '../lib/ids'
import { sampleParsedSchedule } from '../data/sampleData'
import { createClient } from '../../utils/supabase/client'
import type { Session as SupabaseSession, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => initialData(new Date()))
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const [readyUserId, setReadyUserId] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [realNow, setRealNow] = useState(() => new Date())
  const [sessionStart] = useState(() => new Date())
  const clientRef = useRef<SupabaseClient<Database> | null>(null)
  const activeUserIdRef = useRef<string | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const startDemo = useCallback(() => {
    const demoData = initialData(new Date())
    demoData.onboarding = 'done'
    demoData.schedule = sampleParsedSchedule()
    demoData.profile = {
      id: 'me',
      name: 'Demo Student',
      initials: 'DS',
      color: '#F6D27A',
      email: 'demo@example.invalid',
      commuter: true,
      town: '',
      interests: ['Food', 'Cafés'],
    }
    setReadyUserId(null)
    dispatch({ type: 'replaceData', data: demoData })
    setDemoMode(true)
  }, [])

  const endDemo = useCallback(() => {
    setDemoMode(false)
    dispatch({ type: 'replaceData', data: initialData(new Date()) })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setRealNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true
    let generation = 0
    let currentUserId: string | null | undefined
    let unsubscribe: (() => void) | undefined

    const handleSession = async (session: SupabaseSession | null) => {
      const sessionUserId = session?.user.id ?? null
      if (currentUserId === sessionUserId) return
      currentUserId = sessionUserId
      activeUserIdRef.current = sessionUserId
      const requestGeneration = ++generation
      setAuthLoading(true)
      setAuthError(null)
      setPersistenceError(null)
      setReadyUserId(null)

      if (!session) {
        dispatch({ type: 'replaceData', data: initialData(new Date()) })
        setAuthLoading(false)
        return
      }

      try {
        const userId = session.user.id
        const email = session.user.email
        if (!email) throw new Error('Supabase did not return an email address for this account.')
        const client = clientRef.current
        if (!client) throw new Error('Supabase client is not initialized.')

        const saved = await loadAccountData(client, userId)
        if (!mounted || requestGeneration !== generation) return

        const nextData = saved ?? initialData(new Date())
        const name =
          nextData.profile?.name ||
          (typeof session.user.user_metadata.display_name === 'string'
            ? session.user.user_metadata.display_name
            : email.split('@')[0])

        nextData.session = {
          userId,
          email,
          verified: Boolean(session.user.email_confirmed_at),
        }
        nextData.profile = {
          id: 'me',
          name,
          initials: initialsOf(name) || 'ME',
          color: nextData.profile?.color ?? '#F6D27A',
          email,
          commuter: nextData.profile?.commuter ?? true,
          town: nextData.profile?.town ?? '',
          interests: nextData.profile?.interests ?? [],
          energy: nextData.profile?.energy,
        }
        dispatch({ type: 'replaceData', data: nextData })
        setReadyUserId(userId)
        setAuthLoading(false)
      } catch (error) {
        if (!mounted || requestGeneration !== generation) return
        setAuthError(errorMessage(error))
        setAuthLoading(false)
      }
    }

    void Promise.resolve().then(async () => {
      if (!mounted) return
      try {
        const client = await createClient()
        if (!mounted) return
        clientRef.current = client
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
          void Promise.resolve().then(() => handleSession(session))
        })
        unsubscribe = () => subscription.unsubscribe()
      } catch (error) {
        if (mounted) {
          setAuthError(errorMessage(error))
          setAuthLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      generation += 1
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!readyUserId || data.session?.userId !== readyUserId) return
    const client = clientRef.current
    if (!client) return

    const snapshot = data
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      if (activeUserIdRef.current !== readyUserId) return
      try {
        await saveAccountData(client, readyUserId, snapshot)
        if (activeUserIdRef.current === readyUserId) setPersistenceError(null)
      } catch (error) {
        if (activeUserIdRef.current === readyUserId) setPersistenceError(errorMessage(error))
      }
    })
  }, [data, readyUserId])

  const [plansLoadedFor, setPlansLoadedFor] = useState<string | null>(null)
  const [plansError, setPlansError] = useState<string | null>(null)

  const refreshPlans = useCallback(async () => {
    const userId = activeUserIdRef.current
    if (!userId) return
    try {
      const { plans, people } = await fetchSharedPlans(userId)
      if (activeUserIdRef.current !== userId) return
      dispatch({ type: 'setSharedPlans', plans, people })
      setPlansError(null)
    } catch (error) {
      if (activeUserIdRef.current === userId) setPlansError(errorMessage(error))
    } finally {
      if (activeUserIdRef.current === userId) setPlansLoadedFor(userId)
    }
  }, [])

  // Load shared plans once the account is ready, and again whenever the tab
  // comes back into view so RSVPs from other phones show up.
  useEffect(() => {
    if (!readyUserId) return
    void Promise.resolve().then(refreshPlans)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshPlans()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [readyUserId, refreshPlans])

  // Other plan members see my profiles.display_name, which defaults to my NetID.
  const profileName = data.profile?.name
  useEffect(() => {
    if (!readyUserId || !profileName) return
    syncDisplayName(readyUserId, profileName).catch((error: unknown) => {
      if (activeUserIdRef.current === readyUserId) setPersistenceError(errorMessage(error))
    })
  }, [readyUserId, profileName])

  const value = useMemo<AppContextValue>(() => {
    const now = data.demoClock ? new Date(data.demoClock) : realNow
    const statusBase = data.demoClock ? new Date(data.demoClock) : sessionStart
    return {
      data,
      dispatch,
      now,
      today: toISODate(now),
      nowMinutes: minutesOfDay(now),
      friendStatuses: getFriendStatuses(statusBase).filter((s) => isStatusActive(s, now)),
      authLoading,
      authError,
      persistenceError,
      userId: readyUserId,
      // Demo mode has no account, so there are no shared plans to wait for.
      plansLoaded: demoMode || (readyUserId !== null && plansLoadedFor === readyUserId),
      plansError,
      refreshPlans,
      demoMode,
      startDemo,
      endDemo,
    }
  }, [
    data,
    realNow,
    sessionStart,
    authLoading,
    authError,
    persistenceError,
    readyUserId,
    plansLoadedFor,
    plansError,
    refreshPlans,
    demoMode,
    startDemo,
    endDemo,
  ])

  return (
    <AppContext.Provider value={value}>
      <ToastProvider>
        <AuthGate>{children}</AuthGate>
      </ToastProvider>
    </AppContext.Provider>
  )
}

function AuthGate({ children }: { children: ReactNode }) {
  const { authError, persistenceError } = useApp()
  if (authError) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 480 }}>
          <h1>Supabase setup issue</h1>
          <p role="alert">{authError}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    )
  }
  return (
    <>
      {persistenceError && (
        <div className="notice notice-error" role="alert">
          <div>Supabase could not save your latest changes: {persistenceError}</div>
        </div>
      )}
      {children}
    </>
  )
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMessage(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 3200)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && <div className="toast">{message}</div>}
      </div>
    </ToastContext.Provider>
  )
}
