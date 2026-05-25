/**
 * Vercel serverless — public Supabase config at runtime.
 * Reads SUPABASE_* first (reliable on Vercel Functions), then VITE_* (build-style names).
 */
function readSupabaseEnv() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim()

  const key = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()

  return { url, key }
}

export default function handler(req, res) {
  const { url, key } = readSupabaseEnv()

  const configured = Boolean(
    url && key && url.startsWith('https://') && !url.includes('YOUR_PROJECT')
  )

  res.setHeader('Cache-Control', 'public, max-age=60')
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({
    url: configured ? url : null,
    key: configured ? key : null,
    configured,
    ...(configured
      ? {}
      : {
          hint:
            'In Vercel → Settings → Environment Variables, add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for Production (same values as VITE_*), then Redeploy.',
        }),
  })
}
