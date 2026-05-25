import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim()
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim()
  const hasSupabase = Boolean(supabaseUrl && supabaseKey)

  if (mode === 'production' && process.env.VERCEL && !hasSupabase) {
    console.warn(
      '[oor-snacks] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing at build time. ' +
        'Store will use /api/supabase-config at runtime if env vars are set on Vercel.'
    )
  }

  return {
  define: {
    __OOR_SB_URL__: JSON.stringify(supabaseUrl || ''),
    __OOR_SB_KEY__: JSON.stringify(supabaseKey || ''),
  },
  server: {
    port: 5180,
    strictPort: false,
  },
  preview: {
    port: 5180,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  }
})
