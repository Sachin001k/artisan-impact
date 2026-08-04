-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  price_inr int not null,
  category text not null, -- 'painting' | 'craft' | 'print'
  image_url text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  razorpay_order_id text,
  customer_email text,
  total_inr int,
  status text default 'pending', -- 'pending' | 'paid' | 'failed'
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity int default 1
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  donor_email text,
  amount_inr int,
  razorpay_payment_id text,
  created_at timestamptz default now()
);

create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  interest_area text,
  message text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table products enable row level security;
alter table volunteers enable row level security;
alter table donations enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public can read products (shop grid)
create policy if not exists "public read products" on products for select using (true);

-- Public can submit volunteer applications
create policy if not exists "public insert volunteers" on volunteers for insert with check (true);

-- Orders/donations are written server-side only (via the service role key in
-- api/verify-payment.js), so no public insert/select policies are needed for
-- them. The service role key bypasses RLS entirely.

-- Sample products so the shop isn't empty on first load
insert into products (title, artist, price_inr, category, image_url) values
  ('Monsoon in Marigold', 'Aanya, age 11', 1200, 'painting', null),
  ('Terracotta Bird Set', 'Rehan, age 9', 650, 'craft', null),
  ('City of Kites', 'Meher, age 13', 450, 'print', null),
  ('Grandmother''s Garden', 'Simran, age 12', 1800, 'painting', null),
  ('Woven Wall Hanging', 'Dev, age 14', 900, 'craft', null),
  ('Our Street at Dusk', 'Ira, age 10', 380, 'print', null);
