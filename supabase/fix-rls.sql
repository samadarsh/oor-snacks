-- =============================================================================
-- Oor Snacks — FIX checkout RLS error (run once in Supabase → SQL Editor → Run)
-- Error: "new row violates row-level security policy for table orders"
-- =============================================================================

-- 1. Table permissions (required in addition to policies)
grant usage on schema public to anon, authenticated, service_role;
grant insert on public.orders to anon, authenticated, service_role;
grant insert on public.order_items to anon, authenticated, service_role;
grant select, update on public.orders to authenticated, service_role;
grant select on public.order_items to authenticated, service_role;

-- 2. Ensure RLS is on
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- 3. Remove old policies (safe to re-run)
drop policy if exists "public_insert_orders" on public.orders;
drop policy if exists "public_insert_order_items" on public.order_items;
drop policy if exists "staff_select_orders" on public.orders;
drop policy if exists "staff_update_orders" on public.orders;
drop policy if exists "staff_select_order_items" on public.order_items;
drop policy if exists "allow_public_insert_orders" on public.orders;
drop policy if exists "allow_public_insert_order_items" on public.order_items;
drop policy if exists "allow_staff_select_orders" on public.orders;
drop policy if exists "allow_staff_update_orders" on public.orders;
drop policy if exists "allow_staff_select_order_items" on public.order_items;

-- 4. Website checkout: anyone can INSERT (publishable + anon keys)
--    No TO clause = applies to all roles
create policy "allow_public_insert_orders"
  on public.orders
  as permissive
  for insert
  with check (true);

create policy "allow_public_insert_order_items"
  on public.order_items
  as permissive
  for insert
  with check (true);

-- 5. Staff admin: only accounts listed in admin_users may read or update orders.
-- Being signed in is not enough — Supabase allows public sign-ups by default, and the
-- publishable key is public, so anyone could otherwise create an account and read every order.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "allow_staff_select_orders"
  on public.orders
  as permissive
  for select
  to authenticated
  using (public.is_admin());

create policy "allow_staff_update_orders"
  on public.orders
  as permissive
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "allow_staff_select_order_items"
  on public.order_items
  as permissive
  for select
  to authenticated
  using (public.is_admin());

-- 6. Make sure your staff login is on the list (replace the email):
-- insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
