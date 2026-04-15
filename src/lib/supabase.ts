import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Primary: env vars baked in at build time (set as GitHub Actions variables).
// These are safe to be public — Supabase anon keys are designed for browser use.
const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let _client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (_client) return _client
  if (!ENV_URL || !ENV_KEY) throw new Error('Supabase env vars not set')
  _client = createClient(ENV_URL, ENV_KEY)
  return _client
}

export function isConfigured(): boolean {
  return !!(ENV_URL && ENV_KEY)
}
