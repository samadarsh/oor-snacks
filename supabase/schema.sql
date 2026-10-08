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

-- Permissions + policies (see supabase/fix-rls.sql for the full repair script)
grant usage on schema public to anon, authenticated, service_role;
grant insert on public.orders to anon, authenticated, service_role;
grant insert on public.order_items to anon, authenticated, service_role;
grant select, update on public.orders to authenticated, service_role;
grant select on public.order_items to authenticated, service_role;

drop policy if exists "allow_public_insert_orders" on public.orders;
create policy "allow_public_insert_orders"
  on public.orders for insert with check (true);

drop policy if exists "allow_public_insert_order_items" on public.order_items;
create policy "allow_public_insert_order_items"
  on public.order_items for insert with check (true);

-- Staff access: only accounts listed in admin_users may read or update orders.
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

drop policy if exists "allow_staff_select_orders" on public.orders;
create policy "allow_staff_select_orders"
  on public.orders for select to authenticated using (public.is_admin());

drop policy if exists "allow_staff_update_orders" on public.orders;
create policy "allow_staff_update_orders"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "allow_staff_select_order_items" on public.order_items;
create policy "allow_staff_select_order_items"
  on public.order_items for select to authenticated using (public.is_admin());

-- Then add your staff login (see SUPABASE_SETUP.md, Step 2):
-- insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com';
