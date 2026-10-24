/**
 * localStorage persistence. A backend (Supabase, Firebase…) would replace
 * this; until then all data lives only in this browser.
 */
import type { AppData } from '../types'

const KEY = 'adventuretime:v1'

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppData
    return parsed.version === 1 ? parsed : null
  } catch {
    return null
  }
}

/** Returns false when the browser blocks storage (private mode, quota…). */
export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
