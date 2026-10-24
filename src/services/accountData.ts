import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppData } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAppData(value: unknown): value is AppData {
  return (
    isRecord(value) &&
    value.version === 1 &&
    (value.session === null || isRecord(value.session)) &&
    (value.profile === null || isRecord(value.profile)) &&
    (value.schedule === null || isRecord(value.schedule)) &&
    (value.status === null || isRecord(value.status)) &&
    Array.isArray(value.plans) &&
    Array.isArray(value.friendships) &&
    Array.isArray(value.blocked) &&
    Array.isArray(value.extraPeople) &&
    (typeof value.demoClock === 'string' || value.demoClock === null)
  )
}

export async function loadAccountData(client: SupabaseClient, userId: string): Promise<AppData | null> {
  const { data, error } = await client
    .from('user_app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Could not load your saved account data: ${error.message}`)
  if (!data) return null
  if (!isAppData(data.data)) {
    throw new Error('Your saved account data has an unsupported format. Contact the project maintainer.')
  }
  return data.data
}

export async function saveAccountData(client: SupabaseClient, userId: string, data: AppData): Promise<void> {
  const { error } = await client.from('user_app_state').upsert(
    {
      user_id: userId,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(`Could not save your account data: ${error.message}`)
}
