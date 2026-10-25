import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppData } from '../types'
import type { Database, Json } from '../types/database.types'

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

export async function loadAccountData(client: SupabaseClient<Database>, userId: string): Promise<AppData | null> {
  const { data, error } = await client
    .from('user_app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Could not load your saved account data: ${error.message}`)
  if (!data) return null
  const saved = data.data
  if (!isAppData(saved)) {
    throw new Error('Your saved account data has an unsupported format. Contact the project maintainer.')
  }
  const app: AppData = saved
  return { ...app, plans: app.plans.filter((p) => !p.shared) }
}

export async function saveAccountData(client: SupabaseClient<Database>, userId: string, data: AppData): Promise<void> {
  // Shared plans and the people in them live in their own tables; only local demo plans belong in this blob.
  const personal: AppData = { ...data, plans: data.plans.filter((p) => !p.shared), remotePeople: undefined }
  const json = JSON.parse(JSON.stringify(personal)) as Json
  const { error } = await client.from('user_app_state').upsert(
    {
      user_id: userId,
      data: json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(`Could not save your account data: ${error.message}`)
}
