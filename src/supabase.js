import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Prefer new publishable key (required on newer Supabase projects); legacy anon as fallback
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

export const supabase = isSupabaseConfigured()
  ? createClient(url, publishableKey)
  : null
