-- Oor Snacks — run this entire file in Supabase → SQL Editor → Run

-- Orders from website checkout
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  customer_address text not null,
  customer_phone text,
  subtotal int not null,
  shipping int not null default 0,
  total int not null,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'cancelled'))
);

-- Line items for each order
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text,
  product_name text not null,
  weight text not null,
  unit_price int not null,
  qty int not null check (qty > 0),
  line_total int not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- Row Level Security
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- API roles can insert at checkout (publishable + anon keys)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert on public.orders to anon, authenticated, service_role;
grant select, insert on public.order_items to anon, authenticated, service_role;
grant update on public.orders to authenticated, service_role;

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

-- Logged-in staff can read and update orders
drop policy if exists "staff_select_orders" on public.orders;
create policy "staff_select_orders"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "staff_update_orders" on public.orders;
create policy "staff_update_orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "staff_select_order_items" on public.order_items;
create policy "staff_select_order_items"
  on public.order_items for select
  to authenticated
  using (true);
