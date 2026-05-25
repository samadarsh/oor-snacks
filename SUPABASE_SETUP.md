# Supabase setup for Oor Snacks

You created a Supabase project — follow these steps in order.

## Step 1 — Create the database tables

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the full contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
4. Confirm under **Table Editor** you see `orders` and `order_items`.

## Step 2 — Create a staff login

1. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email and a strong password (this is for `/admin.html` only).
3. **Important:** enable **Auto Confirm User** (otherwise login shows *Invalid login credentials*).
4. Save the credentials somewhere safe.

If you already created a user without Auto Confirm: open that user in the dashboard and confirm them, or delete and recreate with Auto Confirm on.

## Step 3 — Copy API keys into the project

1. Go to **Project Settings** → **API**.
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL` (e.g. `https://abcdefgh.supabase.co`)
   - **Publishable key** (`sb_publishable_...`) → `VITE_SUPABASE_PUBLISHABLE_KEY` (**use this for login/checkout**)
   - **Secret key** (`sb_secret_...`) → `SUPABASE_SECRET_KEY` only (never `VITE_` — not for the storefront)
   - Legacy **anon** JWT often returns *Invalid API key* on new projects — use publishable instead
3. In the project folder:

```bash
cp .env.example .env
```

4. Paste your values into `.env` (never commit `.env`). **Restart** `npm run dev` after saving.

## Step 4 — Install and run locally

```bash
npm install
npm run dev
```

Open:

- Store: http://localhost:5180/ (or the port Vite prints in your terminal)
- Staff orders: http://localhost:5180/admin.html

Uses port **5180** by default; if busy, Vite uses the next free port — always check the `npm run dev` output.

## Step 5 — Fix order saving (if admin is empty but WhatsApp works)

If checkout opens WhatsApp but **admin shows no orders**, run [`supabase/fix-rls.sql`](./supabase/fix-rls.sql) in the SQL Editor (fixes database permissions).

## Step 6 — Test an order

1. On the store, add items to the cart → **Place order on website** (name, mobile, address).
2. You should see the green **Order placed successfully** popup within a few seconds.
3. In Supabase **Table Editor** → `orders` and `order_items`, you should see the new row.
4. Sign in at `/admin.html` with your staff user — the same order should appear.

## Step 7 — Deploy (Vercel / Netlify)

Add the same environment variables in your host dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do **not** add the secret key to Vercel/Netlify frontend env vars.

Redeploy after saving.

## Security notes

- The **anon** key is safe in the frontend only because **RLS** blocks strangers from reading orders.
- Only **logged-in staff** can open the admin list.
- Never put the **service_role** key in the website or `.env` used by Vite.

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Orders not in Supabase | Check `.env`, restart `npm run dev`, browser console for errors |
| **`TypeError: Load failed`** or long wait then error | Browser never reached Supabase — not an RLS issue. See below |
| Admin login fails | Confirm user exists under Authentication → Users |
| Admin shows no orders | Same Supabase project URL/key as storefront; staff must be signed in |
| Insert policy error | Run [`supabase/fix-rls.sql`](./supabase/fix-rls.sql) in SQL Editor |

### `Load failed` / very slow checkout

This means the **network request failed** before Supabase answered (Safari shows `TypeError: Load failed`; Chrome often shows `Failed to fetch`).

**Why it feels slow:** the button stays on “One moment…” until the browser gives up (often 10–60 seconds).

**Common causes:**

1. **Live site built without env vars** — In Vercel → Project → **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then **Redeploy**. A build without these cannot save orders on production.
2. **Ad blocker / privacy extension** — Allow `*.supabase.co` or disable the blocker on your site.
3. **Offline / weak network / VPN** — Retry on stable Wi‑Fi.
4. **Stale admin session** — The app now uses a separate store client for checkout; pull latest code and hard-refresh the page.

**Verify the database is OK:** In Supabase SQL Editor, run [`supabase/fix-rls.sql`](./supabase/fix-rls.sql). If inserts work in the dashboard but not on the site, the problem is env/network, not RLS.
