import { createContext, useContext, type Dispatch } from 'react'
import type { AppData, Status } from '../types'
import type { Action } from './reducer'

export interface World {
  data: AppData
  now: Date
  /** YYYY-MM-DD for `now` */
  today: string
  nowMinutes: number
  /** Friends' active statuses from the (mock) server. */
  friendStatuses: Status[]
}

export interface AppContextValue extends World {
  dispatch: Dispatch<Action>
  authLoading: boolean
  authError: string | null
  persistenceError: string | null
  /** Supabase user id of the signed-in account. */
  userId: string | null
  /** True once shared plans have loaded for the signed-in account (always true in demo mode). */
  plansLoaded: boolean
  plansError: string | null
  /** Reload shared plans from Supabase. */
  refreshPlans: () => Promise<void>
  demoMode: boolean
  startDemo: () => void
  endDemo: () => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

export interface ToastContextValue {
  show: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue>({ show: () => {} })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
