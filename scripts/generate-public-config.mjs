/**
 * Runs after `vite build`. Writes dist/oor-config.json from process.env
 * (Vercel injects env vars at build time — more reliable than serverless runtime).
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'dist', 'oor-config.json')

/** Local builds: Vite reads .env but this script needs it on process.env too. */
function loadLocalEnvFile() {
  try {
    const text = readFileSync(join(root, '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const key = t.slice(0, i).trim()
      const val = t.slice(i + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* no .env */
  }
}

loadLocalEnvFile()

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim()
const key = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim()

const configured = Boolean(
  url && key && url.startsWith('https://') && !url.includes('YOUR_PROJECT')
)

const payload = {
  url: configured ? url : null,
  key: configured ? key : null,
  configured,
}

writeFileSync(outPath, JSON.stringify(payload))
console.log(`[oor-snacks] wrote ${outPath} — configured: ${configured}`)

if (!configured && process.env.VERCEL) {
  console.error(
    '[oor-snacks] Vercel build: missing Supabase env.\n' +
      '  Add for Production: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY\n' +
      '  (and SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY with the same values)\n' +
      '  Project: Settings → Environment Variables → Production → Redeploy'
  )
  process.exit(1)
}
