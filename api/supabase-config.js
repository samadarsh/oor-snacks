/**
 * Vercel serverless — exposes public Supabase config at runtime.
 * Publishable key is safe to expose; fixes builds that ran before Vercel env vars existed.
 */
export default function handler(req, res) {
  const url = (process.env.VITE_SUPABASE_URL || '').trim()
  const key = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()

  const configured = Boolean(
    url && key && url.startsWith('https://') && !url.includes('YOUR_PROJECT')
  )

  res.setHeader('Cache-Control', 'public, max-age=60')
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({
    url: configured ? url : null,
    key: configured ? key : null,
    configured,
  })
}
