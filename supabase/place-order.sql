-- =============================================================================
-- Oor Snacks — server-side checkout (run in Supabase → SQL Editor → Run)
-- Safe to re-run. Run after schema.sql on new projects, and once on existing ones.
--
-- The website no longer inserts into orders / order_items directly. It calls
-- public.place_order(), which:
--   * looks up every price in product_prices (the browser only sends ids + qty),
--   * computes subtotal, shipping and total itself,
--   * validates name / phone / address / quantities,
--   * writes the order and its items in one transaction (no orphan orders),
--   * is idempotent per order id, so a retried request never duplicates an order.
-- =============================================================================

-- 1. Price list — the source of truth for checkout.
--    When you change a price, update it here AND on products.html / index.html.
create table if not exists public.product_prices (
  product_id text not null,
  weight text not null,
  name text not null,
  price int not null check (price > 0),
  active boolean not null default true,
  primary key (product_id, weight)
);

alter table public.product_prices enable row level security;
revoke all on public.product_prices from anon, authenticated;

insert into public.product_prices (product_id, weight, name, price) values
  ('p1', '250g',   'Kai Murukku',               140),
  ('p1', '500g',   'Kai Murukku',               252),
  ('p2', '250g',   'Madras Mixture',            130),
  ('p2', '500g',   'Madras Mixture',            234),
  ('p3', '150g',   'Pepper Banana Chips',       110),
  ('p3', '300g',   'Pepper Banana Chips',       198),
  ('p4', '250g',   'Garlic Karasev',            120),
  ('p4', '500g',   'Garlic Karasev',            216),
  ('s1', '250g',   'Tirunelveli Halwa',         280),
  ('s1', '500g',   'Tirunelveli Halwa',         518),
  ('s2', '6 pcs',  'Adhirasam',                 120),
  ('s2', '12 pcs', 'Adhirasam',                 220),
  ('s3', '250g',   'Srivilliputhur Palkova',    260),
  ('s3', '500g',   'Srivilliputhur Palkova',    468),
  ('s4', '200g',   'Kovilpatti Kadalai Mittai', 150),
  ('s4', '400g',   'Kovilpatti Kadalai Mittai', 270),
  ('s5', 'Pack',   'Sakkarai Pongal',           180),
  ('s6', '8 pcs',  'Thoothukudi Macaroon',      160),
  ('s6', '16 pcs', 'Thoothukudi Macaroon',      300),
  ('c1', 'Pack',   'Classic Tea-Time Box',      350),
  ('c2', 'Pack',   'Festive Gifting Box',       550)
on conflict (product_id, weight) do update
  set name = excluded.name, price = excluded.price, active = true;

create index if not exists orders_phone_created_at_idx
  on public.orders (customer_phone, created_at desc);

-- 2. Checkout function. Shipping rules must match SITE in src/config.js.
create or replace function public.place_order(
  p_order_id uuid,
  p_customer_name text,
  p_customer_address text,
  p_customer_phone text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  shipping_fee constant int := 60;
  free_shipping_min constant int := 500;
  max_recent_orders constant int := 5;

  v_name text := btrim(coalesce(p_customer_name, ''));
  v_address text := btrim(coalesce(p_customer_address, ''));
  v_phone text := btrim(coalesce(p_customer_phone, ''));
  v_subtotal int := 0;
  v_shipping int;
  v_existing public.orders%rowtype;
  v_line record;
begin
  if p_order_id is null then
    raise exception 'Missing order id.' using errcode = '22023';
  end if;

  -- Retried request (e.g. the first one timed out after saving): return the saved order.
  select * into v_existing from public.orders where id = p_order_id;
  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'subtotal', v_existing.subtotal,
      'shipping', v_existing.shipping,
      'total', v_existing.total
    );
  end if;

  if char_length(v_name) not between 1 and 120 then
    raise exception 'Please enter your name (up to 120 characters).' using errcode = '22023';
  end if;
  if char_length(v_address) not between 5 and 500 then
    raise exception 'Please enter your full delivery address (up to 500 characters).' using errcode = '22023';
  end if;
  if v_phone !~ '^[0-9]{10}$' then
    raise exception 'Please enter a valid 10-digit mobile number.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Your basket is empty or too large.' using errcode = '22023';
  end if;

  -- Light flood guard: the same mobile number can't place more than a few orders in 10 minutes.
  if (
    select count(*) from public.orders
    where customer_phone = v_phone and created_at > now() - interval '10 minutes'
  ) >= max_recent_orders then
    raise exception 'Too many orders from this number. Please wait a few minutes or order on WhatsApp.'
      using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.checkout_lines (
    product_id text,
    weight text,
    name text,
    unit_price int,
    qty int
  ) on commit drop;
  truncate pg_temp.checkout_lines;

  -- Merge duplicate lines, then price every line from product_prices.
  insert into pg_temp.checkout_lines (product_id, weight, name, unit_price, qty)
  select req.product_id, req.weight, pp.name, pp.price, req.qty
  from (
    select item->>'product_id' as product_id,
           item->>'weight' as weight,
           sum((item->>'qty')::int) as qty
    from jsonb_array_elements(p_items) as item
    group by 1, 2
  ) as req
  left join public.product_prices pp
    on pp.product_id = req.product_id and pp.weight = req.weight and pp.active;

  if exists (select 1 from pg_temp.checkout_lines where unit_price is null) then
    raise exception 'Some items in your basket are no longer available. Please refresh and try again.'
      using errcode = '22023';
  end if;
  if exists (select 1 from pg_temp.checkout_lines where qty is null or qty not between 1 and 99) then
    raise exception 'Each item quantity must be between 1 and 99.' using errcode = '22023';
  end if;

  select sum(unit_price * qty) into v_subtotal from pg_temp.checkout_lines;
  v_shipping := case when v_subtotal >= free_shipping_min then 0 else shipping_fee end;

  insert into public.orders (id, customer_name, customer_address, customer_phone, subtotal, shipping, total, status)
  values (p_order_id, v_name, v_address, v_phone, v_subtotal, v_shipping, v_subtotal + v_shipping, 'pending');

  insert into public.order_items (order_id, product_id, product_name, weight, unit_price, qty, line_total)
  select p_order_id, product_id, name, weight, unit_price, qty, unit_price * qty
  from pg_temp.checkout_lines;

  return jsonb_build_object(
    'id', p_order_id,
    'subtotal', v_subtotal,
    'shipping', v_shipping,
    'total', v_subtotal + v_shipping
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Your basket has an invalid quantity. Please refresh and try again.' using errcode = '22023';
end;
$$;

revoke execute on function public.place_order(uuid, text, text, text, jsonb) from public;
grant execute on function public.place_order(uuid, text, text, text, jsonb) to anon, authenticated;

-- 3. Close the direct-insert path: browsers may only create orders through place_order().
drop policy if exists "allow_public_insert_orders" on public.orders;
drop policy if exists "allow_public_insert_order_items" on public.order_items;
revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;
