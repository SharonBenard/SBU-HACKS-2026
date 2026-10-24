import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { AppContext, ToastContext, type AppContextValue } from './context'
import { initialData, reducer } from './reducer'
import { loadData, saveData } from '../services/storage'
import { getFriendStatuses } from '../services/friendsApi'
import { minutesOfDay, toISODate } from '../lib/dates'
import { isStatusActive } from './selectors'

function probeStorage(): boolean {
  try {
    const k = '__at_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, () => loadData() ?? initialData(new Date()))
  const [storageOk] = useState(probeStorage)
  const [realNow, setRealNow] = useState(() => new Date())
  const [sessionStart] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setRealNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (storageOk) saveData(data)
  }, [data, storageOk])

  const value = useMemo<AppContextValue>(() => {
    const now = data.demoClock ? new Date(data.demoClock) : realNow
    const statusBase = data.demoClock ? new Date(data.demoClock) : sessionStart
    return {
      data,
      dispatch,
      storageOk,
      now,
      today: toISODate(now),
      nowMinutes: minutesOfDay(now),
      friendStatuses: getFriendStatuses(statusBase).filter((s) => isStatusActive(s, now)),
    }
  }, [data, realNow, sessionStart, storageOk])

  return (
    <AppContext.Provider value={value}>
      <ToastProvider>{children}</ToastProvider>
    </AppContext.Provider>
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
