-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Lets the admin hide a product from the shop without deleting it.
-- Products that were ordered (or added to a cart) can't be deleted because
-- past orders still point to them — "Remove from shop" in /admin hides them instead.

alter table products add column if not exists is_active boolean not null default true;
create index if not exists products_active_created_idx on products (is_active, created_at desc);
