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

1. On the store, add items to the cart and checkout (name + address).
2. You should see **“Order saved”** then WhatsApp opens.
3. In Supabase **Table Editor** → `orders` and `order_items`, you should see the new row.
4. Sign in at `/admin.html` with your staff user — the same order should appear.

## Step 6 — Deploy (Vercel / Netlify)

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
| Admin login fails | Confirm user exists under Authentication → Users |
| Admin shows no orders | Same Supabase project URL/key as storefront; staff must be signed in |
| Insert policy error | Re-run `supabase/schema.sql` in SQL Editor |
