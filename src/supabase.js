import { createClient } from '@supabase/supabase-js'

const trim = (v) => (typeof v === 'string' ? v.trim() : '')

const readBuildEnv = () => ({
  url: trim(import.meta.env.VITE_SUPABASE_URL || __OOR_SB_URL__),
  key: trim(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      __OOR_SB_KEY__
  ),
})

export const isValidSupabaseConfig = (url, key) =>
  Boolean(url && key && !url.includes('YOUR_PROJECT') && url.startsWith('https://'))

/** Sync check — true when env was present at build time (local dev / good Vercel build). */
export const isSupabaseConfigured = () => {
  const { url, key } = readBuildEnv()
  return isValidSupabaseConfig(url, key)
}

let clients = null
let initPromise = null

async function fetchJsonConfig(path) {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function loadConfig() {
  const build = readBuildEnv()
  if (isValidSupabaseConfig(build.url, build.key)) return build

  try {
    const staticCfg = await fetchJsonConfig('/oor-config.json')
    if (staticCfg?.configured && staticCfg.url && staticCfg.key) {
      return { url: trim(staticCfg.url), key: trim(staticCfg.key) }
    }
  } catch (err) {
    console.warn('[Oor] Could not load /oor-config.json', err)
  }

  try {
    const apiCfg = await fetchJsonConfig('/api/supabase-config')
    if (apiCfg?.configured && apiCfg.url && apiCfg.key) {
      return { url: trim(apiCfg.url), key: trim(apiCfg.key) }
    }
  } catch (err) {
    console.warn('[Oor] Could not load /api/supabase-config', err)
  }

  return { url: '', key: '' }
}

/**
 * Resolve Supabase clients (build env → /oor-config.json → /api fallback).
 */
export async function initSupabase() {
  if (clients) return clients
  if (!initPromise) {
    initPromise = (async () => {
      const { url, key } = await loadConfig()
      if (!isValidSupabaseConfig(url, key)) {
        clients = { configured: false, supabase: null, supabaseStore: null }
        return clients
      }

      clients = {
        configured: true,
        supabaseStore: createClient(url, key, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }),
        supabase: createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'oor-snacks-admin-auth',
          },
        }),
      }
      return clients
    })()
  }
  return initPromise
}

/** Warm config on storefront/admin load (no-op if already initialized). */
export function warmSupabase() {
  void initSupabase()
}
