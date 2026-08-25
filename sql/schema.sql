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
  user_id uuid references auth.users(id),
  total_inr int,
  status text default 'pending', -- 'pending' | 'paid' | 'failed'
  created_at timestamptz default now()
);

alter table orders add column if not exists user_id uuid references auth.users(id);

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
drop policy if exists "public read products" on products;
create policy "public read products" on products for select using (true);

-- Public can submit volunteer applications
drop policy if exists "public insert volunteers" on volunteers;
create policy "public insert volunteers" on volunteers for insert with check (true);

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

-- ============================================================
-- ARTISTS — one row per young artist, so products and blog
-- posts can link to a bio page (and a printable QR code).
-- ============================================================
create table if not exists artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int,
  bio text,
  avatar_color text default '#C8432E', -- hex used for the initials avatar circle
  created_at timestamptz default now()
);

alter table products add column if not exists artist_id uuid references artists(id);

alter table artists enable row level security;
drop policy if exists "public read artists" on artists;
create policy "public read artists" on artists for select using (true);

-- Fixed ids so this seed can be re-run safely and products/posts below can reference them.
insert into artists (id, name, age, bio, avatar_color) values
  ('a1000000-0000-0000-0000-000000000001', 'Aanya', 11, 'Aanya joined the program eight months ago, sketching in the margins of her school notebook. Her monsoon series now hangs in homes of six collectors across the country.', '#C8432E'),
  ('a1000000-0000-0000-0000-000000000002', 'Rehan', 9, 'Rehan discovered clay before he could properly hold a pencil. He fired his first terracotta piece this March and hasn''t stopped since.', '#3457D5'),
  ('a1000000-0000-0000-0000-000000000003', 'Meher', 13, 'Meher draws kites because, in her words, "they''re the only thing allowed to just float." Her print series is inspired by her rooftop in old Ahmedabad.', '#2F8F7E'),
  ('a1000000-0000-0000-0000-000000000004', 'Simran', 12, 'Simran paints her grandmother''s garden entirely from memory — a place that no longer exists, rebuilt one canvas at a time.', '#E8A23B'),
  ('a1000000-0000-0000-0000-000000000005', 'Dev', 14, 'Dev learned to weave on the loom his grandfather left behind. Every wall hanging he makes carries a pattern passed down through the family.', '#8a5cd6'),
  ('a1000000-0000-0000-0000-000000000006', 'Ira', 10, 'Ira paints her street at dusk, over and over, chasing the exact color the sky turns right before the streetlights come on.', '#f2c06e')
on conflict (id) do nothing;

update products set artist_id = 'a1000000-0000-0000-0000-000000000001' where artist = 'Aanya, age 11' and artist_id is null;
update products set artist_id = 'a1000000-0000-0000-0000-000000000002' where artist = 'Rehan, age 9' and artist_id is null;
update products set artist_id = 'a1000000-0000-0000-0000-000000000003' where artist = 'Meher, age 13' and artist_id is null;
update products set artist_id = 'a1000000-0000-0000-0000-000000000004' where artist = 'Simran, age 12' and artist_id is null;
update products set artist_id = 'a1000000-0000-0000-0000-000000000005' where artist = 'Dev, age 14' and artist_id is null;
update products set artist_id = 'a1000000-0000-0000-0000-000000000006' where artist = 'Ira, age 10' and artist_id is null;

-- ============================================================
-- POSTS — the "Art Diaries" blog. One row per monthly diary
-- entry, each tied to the artist it's about.
-- ============================================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  artist_id uuid references artists(id),
  excerpt text,
  content text not null,
  gradient_from text default '#C8432E',
  gradient_to text default '#e0694f',
  published_at timestamptz default now()
);

alter table posts enable row level security;
drop policy if exists "public read posts" on posts;
create policy "public read posts" on posts for select using (true);

insert into posts (slug, title, artist_id, excerpt, content, gradient_from, gradient_to, published_at) values
  ('aanya-monsoon-sky', '"I paint the sky the colour I want it to be."', 'a1000000-0000-0000-0000-000000000001',
   'Aanya joined the program eight months ago, sketching in the margins of her school notebook. Today her monsoon series hangs in six collectors'' homes across the country.',
   'Aanya joined the program eight months ago, sketching in the margins of her school notebook. Today her monsoon series hangs in our shop — and in the homes of six collectors across the country. This is her diary entry, in her own words.

"I don''t paint the sky the colour it actually is. I paint it the colour I want it to be that day. If I''m happy the sky in my painting goes gold at the edges. If I''m in a mood, I let it stay grey a little longer before I add the gold in."',
   '#C8432E', '#e0694f', now() - interval '0 days'),
  ('rehan-first-kiln-fire', 'Rehan''s First Kiln Fire', 'a1000000-0000-0000-0000-000000000002',
   'Rehan discovered clay before he could properly hold a pencil. He fired his first terracotta piece this March.',
   'Rehan discovered clay before he could properly hold a pencil. He fired his first terracotta piece this March, and hasn''t stopped since — his bird set is now one of the shop''s most-loved pieces.',
   '#3457D5', '#6c86e6', now() - interval '30 days'),
  ('meher-kites', 'Meher on Why She Draws Kites', 'a1000000-0000-0000-0000-000000000003',
   'Meher draws kites because, in her words, "they''re the only thing allowed to just float."',
   'Meher draws kites because, in her words, "they''re the only thing allowed to just float." Her print series is inspired by the view from her rooftop in old Ahmedabad.',
   '#2F8F7E', '#4fb5a3', now() - interval '60 days'),
  ('dev-grandfathers-loom', 'Dev and the Loom His Grandfather Left', 'a1000000-0000-0000-0000-000000000005',
   'Dev learned to weave on the loom his grandfather left behind — a pattern passed down through the family.',
   'Dev learned to weave on the loom his grandfather left behind. Every wall hanging he makes carries a pattern passed down through the family, updated with his own colour choices.',
   '#8a5cd6', '#c390f0', now() - interval '90 days'),
  ('simran-grandmothers-garden', 'Simran''s Garden, Painted from Memory', 'a1000000-0000-0000-0000-000000000004',
   'Simran paints her grandmother''s garden entirely from memory — a place that no longer exists.',
   'Simran paints her grandmother''s garden entirely from memory — a place that no longer exists, rebuilt one canvas at a time. She''s painted it four times now, and says each one gets a little closer to right.',
   '#E8A23B', '#f2c06e', now() - interval '120 days')
on conflict (slug) do nothing;

-- ============================================================
-- TESTIMONIALS — customer feedback. Anyone can submit; only
-- approved rows are publicly readable. Approve manually in the
-- Supabase Table Editor by flipping `approved` to true.
-- ============================================================
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  quote text not null,
  rating int check (rating between 1 and 5),
  approved boolean not null default false,
  created_at timestamptz default now()
);

alter table testimonials enable row level security;
drop policy if exists "public read approved testimonials" on testimonials;
create policy "public read approved testimonials" on testimonials for select using (approved = true);
drop policy if exists "public insert testimonials" on testimonials;
create policy "public insert testimonials" on testimonials for insert with check (true);

insert into testimonials (id, customer_name, quote, rating, approved) values
  ('7e500000-0000-0000-0000-000000000001', 'Nikhil R.', 'The Monsoon in Marigold print is the first thing people notice when they walk into our living room. Knowing it funded a child''s next set of paints makes it mean even more.', 5, true),
  ('7e500000-0000-0000-0000-000000000002', 'Farah S.', 'Ordered two pieces for a housewarming gift — arrived well packed, and the little bio card about the artist was a lovely touch.', 5, true)
on conflict (id) do nothing;

-- ============================================================
-- CART_EVENTS — a lightweight "added to cart" log, so the admin
-- dashboard can see interest even when it doesn't convert to a sale.
-- ============================================================
create table if not exists cart_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  created_at timestamptz default now()
);

alter table cart_events enable row level security;
drop policy if exists "public insert cart_events" on cart_events;
create policy "public insert cart_events" on cart_events for insert with check (true);

-- ============================================================
-- LOGINS — track all user login events for audit and analytics
-- ============================================================
create table if not exists logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text not null,
  user_type text default 'customer', -- 'customer' | 'admin'
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table logins enable row level security;
drop policy if exists "admin read logins" on logins;
create policy "admin read logins" on logins for select using (is_admin());
drop policy if exists "service insert logins" on logins;
create policy "service insert logins" on logins for insert with check (true);

-- ============================================================
-- ADMINS — emails allowed to see the admin dashboard
-- (Settings → sql/schema.sql). Add more any time with:
--   insert into admins (email) values ('someone@example.com');
-- ============================================================
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null
);

insert into admins (email) values ('admin@gmail.com') on conflict (email) do nothing;

-- Runs with the privileges of whoever created it (not the caller), so it can
-- check the admins table even though admins itself has no public read policy.
-- Supabase auto-exposes this as an RPC: supabase.rpc('is_admin').
create or replace function is_admin() returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admins where email = auth.jwt() ->> 'email'
  );
$$;

alter table admins enable row level security;
-- Intentionally no select/insert policies here — admins is only ever read
-- from inside is_admin() above, never queried directly by clients.

-- Give the admin dashboard read access to the tables that were previously
-- server-only (orders/donations/volunteers) or approved-only (testimonials),
-- plus the ability to approve pending testimonials.
drop policy if exists "admin read orders" on orders;
create policy "admin read orders" on orders for select using (is_admin());

drop policy if exists "admin read order_items" on order_items;
create policy "admin read order_items" on order_items for select using (is_admin());

drop policy if exists "admin read donations" on donations;
create policy "admin read donations" on donations for select using (is_admin());

drop policy if exists "admin read volunteers" on volunteers;
create policy "admin read volunteers" on volunteers for select using (is_admin());

drop policy if exists "admin read testimonials" on testimonials;
create policy "admin read testimonials" on testimonials for select using (is_admin());

drop policy if exists "admin update testimonials" on testimonials;
create policy "admin update testimonials" on testimonials for update using (is_admin()) with check (is_admin());

drop policy if exists "admin read cart_events" on cart_events;
create policy "admin read cart_events" on cart_events for select using (is_admin());

-- ============================================================
-- CUSTOMER "MY ACCOUNT" ACCESS — a signed-in shopper can read
-- their own orders (and the line items inside them), for the
-- personal stats dashboard at account.html.
-- ============================================================
drop policy if exists "own orders" on orders;
create policy "own orders" on orders for select using (auth.uid() = user_id);

drop policy if exists "own order_items" on order_items;
create policy "own order_items" on order_items for select using (
  exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);
