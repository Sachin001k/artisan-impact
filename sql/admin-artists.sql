-- Run this once in Supabase: Project → SQL Editor → New query → paste → Run. Safe to re-run.
-- Lets admins add new artists (typing a new name in /admin/products creates one)
-- and edit existing artists' details.

drop policy if exists "admin insert artists" on artists;
create policy "admin insert artists" on artists for insert with check (is_admin());
drop policy if exists "admin update artists" on artists;
create policy "admin update artists" on artists for update using (is_admin()) with check (is_admin());

-- No two artists with the same name (ignoring capitals / extra spaces)
create unique index if not exists artists_name_key on artists (lower(trim(name)));
