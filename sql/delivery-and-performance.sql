-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run
-- (after schema.sql and stats-and-images.sql). Safe to re-run.
--
-- Adds:
--   1. addresses — customers' saved delivery addresses (each customer sees only their own)
--   2. orders.shipping_address — a frozen copy of the address an order ships to
--   3. orders.fulfillment_status — processing → shipped → delivered, updated from /admin
--   4. Indexes + uniqueness for speed at scale and to block duplicate payments

-- ============================================================
-- 1. ADDRESSES
-- ============================================================
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 100),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),        -- 10-digit Indian mobile
  line1 text not null check (length(trim(line1)) between 3 and 200),  -- flat / house / building
  line2 text,                                                    -- street / area
  landmark text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists addresses_user_id_idx on addresses (user_id);

alter table addresses enable row level security;
drop policy if exists "own addresses select" on addresses;
create policy "own addresses select" on addresses for select using (auth.uid() = user_id);
drop policy if exists "own addresses insert" on addresses;
create policy "own addresses insert" on addresses for insert with check (auth.uid() = user_id);
drop policy if exists "own addresses update" on addresses;
create policy "own addresses update" on addresses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own addresses delete" on addresses;
create policy "own addresses delete" on addresses for delete using (auth.uid() = user_id);

-- Only one default address per customer: making one default clears the others
create or replace function addresses_single_default() returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists addresses_single_default on addresses;
create trigger addresses_single_default before insert or update on addresses
  for each row execute function addresses_single_default();

-- ============================================================
-- 2 + 3. ORDERS — shipping address snapshot + delivery status
-- ============================================================
alter table orders add column if not exists shipping_address jsonb;
alter table orders add column if not exists fulfillment_status text not null default 'processing';
alter table orders drop constraint if exists orders_fulfillment_status_check;
alter table orders add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('processing', 'shipped', 'delivered', 'cancelled'));
alter table orders add column if not exists fulfillment_updated_at timestamptz;

-- Admins can update orders (used for the delivery status dropdown in /admin)
drop policy if exists "admin update orders" on orders;
create policy "admin update orders" on orders for update using (is_admin()) with check (is_admin());

-- ============================================================
-- 4. INDEXES — keep common lookups fast as data grows
-- ============================================================
-- One order row per Razorpay order / one donation per payment, even if the
-- payment callback is retried at the same instant
create unique index if not exists orders_razorpay_order_id_key on orders (razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists donations_razorpay_payment_id_key on donations (razorpay_payment_id) where razorpay_payment_id is not null;

create index if not exists orders_user_id_idx on orders (user_id);
create index if not exists orders_status_created_idx on orders (status, created_at desc);
create index if not exists order_items_order_id_idx on order_items (order_id);
create index if not exists order_items_product_id_idx on order_items (product_id);
create index if not exists products_created_at_idx on products (created_at desc);
create index if not exists cart_events_created_at_idx on cart_events (created_at);
create index if not exists page_views_visitor_created_idx on page_views (created_at, visitor_id);
create index if not exists testimonials_approved_created_idx on testimonials (approved, created_at desc);
