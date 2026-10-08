-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run
-- (after schema.sql). Safe to re-run.
--
-- Adds:
--   1. page_views   — visitor tracking for the admin "Statistics" card
--   2. cart_events.visitor_id — so "added to cart" counts people, not clicks
--   3. admin_stats() — one RPC returning every number the Statistics card shows
--   4. Admin write access to products (previously missing — edits from
--      admin-products.html were silently blocked by RLS)
--   5. site_images table + "site-images" Storage bucket for admin image uploads

-- ============================================================
-- 1. PAGE VIEWS
-- ============================================================
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,   -- random id kept in the visitor's localStorage
  path text,
  created_at timestamptz default now()
);
create index if not exists page_views_created_at_idx on page_views (created_at);

alter table page_views enable row level security;
drop policy if exists "public insert page_views" on page_views;
create policy "public insert page_views" on page_views for insert with check (true);
drop policy if exists "admin read page_views" on page_views;
create policy "admin read page_views" on page_views for select using (is_admin());

-- ============================================================
-- 2. CART EVENTS — track which visitor added to cart
-- ============================================================
alter table cart_events add column if not exists visitor_id uuid;

-- ============================================================
-- 3. ADMIN STATS RPC — supabase.rpc('admin_stats')
-- "This month" is the current calendar month in India time.
-- ============================================================
create or replace function admin_stats() returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  month_start timestamptz := date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  return json_build_object(
    'visitors_month', (select count(distinct visitor_id) from page_views where created_at >= month_start),
    'visitors_all',   (select count(distinct visitor_id) from page_views),
    -- older cart_events rows have no visitor_id; each of those counts as one person
    'cart_month',     (select count(distinct coalesce(visitor_id, id)) from cart_events where created_at >= month_start),
    'cart_all',       (select count(distinct coalesce(visitor_id, id)) from cart_events),
    'buyers_month',   (select count(distinct coalesce(customer_email, id::text)) from orders where status = 'paid' and created_at >= month_start),
    'buyers_all',     (select count(distinct coalesce(customer_email, id::text)) from orders where status = 'paid'),
    'sold_month',     (select coalesce(sum(oi.quantity), 0) from order_items oi join orders o on o.id = oi.order_id where o.status = 'paid' and o.created_at >= month_start),
    'sold_all',       (select coalesce(sum(oi.quantity), 0) from order_items oi join orders o on o.id = oi.order_id where o.status = 'paid')
  );
end;
$$;

-- ============================================================
-- 4. PRODUCTS — admins can add / edit / delete
-- ============================================================
drop policy if exists "admin insert products" on products;
create policy "admin insert products" on products for insert with check (is_admin());
drop policy if exists "admin update products" on products;
create policy "admin update products" on products for update using (is_admin()) with check (is_admin());
drop policy if exists "admin delete products" on products;
create policy "admin delete products" on products for delete using (is_admin());

-- ============================================================
-- 5. SITE IMAGES — one row per image slot on the website
-- (e.g. 'hero', 'about', 'journey-1-before'). The homepage reads
-- these and falls back to the built-in image if a slot is empty.
-- ============================================================
create table if not exists site_images (
  slot text primary key,
  image_url text not null,
  updated_at timestamptz default now()
);

alter table site_images enable row level security;
drop policy if exists "public read site_images" on site_images;
create policy "public read site_images" on site_images for select using (true);
drop policy if exists "admin insert site_images" on site_images;
create policy "admin insert site_images" on site_images for insert with check (is_admin());
drop policy if exists "admin update site_images" on site_images;
create policy "admin update site_images" on site_images for update using (is_admin()) with check (is_admin());
drop policy if exists "admin delete site_images" on site_images;
create policy "admin delete site_images" on site_images for delete using (is_admin());

-- Public Storage bucket the admin uploads into (5 MB limit, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin upload site-images" on storage.objects;
create policy "admin upload site-images" on storage.objects for insert
  with check (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admin update site-images" on storage.objects;
create policy "admin update site-images" on storage.objects for update
  using (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admin delete site-images" on storage.objects;
create policy "admin delete site-images" on storage.objects for delete
  using (bucket_id = 'site-images' and public.is_admin());
