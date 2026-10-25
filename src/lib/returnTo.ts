/**
 * Where to go after sign-in and onboarding, e.g. an invite link opened while
 * signed out. Survives the magic-link round trip, which lands on /auth/callback.
 */
const KEY = 'adventuretime:returnTo'

export function rememberReturnTo(path: string): void {
  try {
    localStorage.setItem(KEY, path)
  } catch {
    // Storage blocked: the user lands on Home instead.
  }
}

export function takeReturnTo(): string | null {
  try {
    const path = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    // Only same-site paths, never "//evil.example".
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null
  } catch {
    return null
  }
}
