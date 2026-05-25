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

-- 5. Staff admin: logged-in users can read and update
create policy "allow_staff_select_orders"
  on public.orders
  as permissive
  for select
  to authenticated
  using (true);

create policy "allow_staff_update_orders"
  on public.orders
  as permissive
  for update
  to authenticated
  using (true)
  with check (true);

create policy "allow_staff_select_order_items"
  on public.order_items
  as permissive
  for select
  to authenticated
  using (true);
