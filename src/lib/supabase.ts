import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'supabase_config'

interface SupabaseConfig { url: string; anonKey: string }

export function getConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveConfig(url: string, anonKey: string): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }))
  _client = createClient(url, anonKey)
}

let _client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (_client) return _client
  const cfg = getConfig()
  if (!cfg) throw new Error('Supabase not configured')
  _client = createClient(cfg.url, cfg.anonKey)
  return _client
}

export function isConfigured(): boolean {
  return getConfig() !== null
}
