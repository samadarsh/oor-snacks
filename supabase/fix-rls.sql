-- Run this in Supabase → SQL Editor if checkout opens WhatsApp but admin shows no orders.
-- Fixes: "new row violates row-level security policy"

-- Table access for API roles
grant usage on schema public to anon, authenticated, service_role;
grant select, insert on public.orders to anon, authenticated, service_role;
grant select, insert on public.order_items to anon, authenticated, service_role;
grant update on public.orders to authenticated, service_role;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Anyone checking out can insert (publishable + anon keys)
drop policy if exists "public_insert_orders" on public.orders;
create policy "public_insert_orders"
  on public.orders
  as permissive
  for insert
  to public
  with check (true);

drop policy if exists "public_insert_order_items" on public.order_items;
create policy "public_insert_order_items"
  on public.order_items
  as permissive
  for insert
  to public
  with check (true);

-- Staff (logged in) can read and update
drop policy if exists "staff_select_orders" on public.orders;
create policy "staff_select_orders"
  on public.orders
  for select
  to authenticated
  using (true);

drop policy if exists "staff_update_orders" on public.orders;
create policy "staff_update_orders"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "staff_select_order_items" on public.order_items;
create policy "staff_select_order_items"
  on public.order_items
  for select
  to authenticated
  using (true);
