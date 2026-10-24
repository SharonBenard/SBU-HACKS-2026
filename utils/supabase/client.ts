import type { SupabaseClient } from '@supabase/supabase-js'

let supabase: Promise<SupabaseClient> | undefined

export function createClient(): Promise<SupabaseClient> {
  if (supabase) return supabase

  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
  }

  supabase = import('@supabase/supabase-js').then(({ createClient: createSupabaseClient }) =>
    createSupabaseClient(url, anonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    }),
  )
  return supabase
}