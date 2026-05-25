import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = () =>
  Boolean(
    url &&
      publishableKey &&
      !url.includes('YOUR_PROJECT') &&
      url.startsWith('https://')
  )

const clientOptions = isSupabaseConfigured() ? { url, publishableKey } : null

/** Store checkout — no auth session (avoids admin login interfering with orders). */
export const supabaseStore = clientOptions
  ? createClient(clientOptions.url, clientOptions.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

/** Admin portal — keeps staff login session. */
export const supabase = clientOptions
  ? createClient(clientOptions.url, clientOptions.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'oor-snacks-admin-auth',
      },
    })
  : null
