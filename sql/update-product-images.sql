-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- This sets product photos to the real photos
-- from the /images folder, matched to the closest product price.

-- first-part-photo-and-product-200rs.jpg (~₹200) → Our Street at Dusk (₹380)
UPDATE products SET image_url = '/images/first-part-photo-and-product-200rs.jpg' WHERE title = 'Our Street at Dusk' AND price_inr = 380;

-- first-part-photo-and-product-650rs.jpg (₹650) → Terracotta Bird Set (₹650, exact match)
UPDATE products SET image_url = '/images/first-part-photo-and-product-650rs.jpg' WHERE title = 'Terracotta Bird Set' AND price_inr = 650;

-- first-part-photo-and-product-950rs.jpg (~₹950) → Woven Wall Hanging (₹900, closest)
UPDATE products SET image_url = '/images/first-part-photo-and-product-950rs.jpg' WHERE title = 'Woven Wall Hanging' AND price_inr = 900;

-- first-part-photo.jpg (no price hint) → City of Kites (₹450) — arbitrary pick, swap if you'd rather use it elsewhere
UPDATE products SET image_url = '/images/first-part-photo.jpg' WHERE title = 'City of Kites' AND price_inr = 450;

-- Monsoon in Marigold (₹1200) and Grandmother's Garden (₹1800) have no real
-- photo yet, so they show a plain colour block. Upload one any time from
-- /admin → Site Images → Product photos (or /admin/products → Edit).

-- =============================================================================
-- IMAGE REPLACEMENT GUIDE
-- =============================================================================
-- Local /images paths work in both local dev (vercel dev) and production
-- (Vercel serves the whole repo as static files) — no extra setup needed.
--
-- To swap in more real photos later:
-- 1. Add the new image file to the /images folder (NO SPACES in the
--    filename — vercel dev's static server 404s on filenames with spaces,
--    even URL-encoded — confirmed the hard way on this project)
-- 2. UPDATE products SET image_url = '/images/your-file-name.jpg' WHERE title = '...';
--
-- Or move to Supabase Storage for production (optional, not required):
-- 1. Supabase Dashboard → Storage → create a public bucket named "products"
-- 2. Upload images, copy each "Public URL"
-- 3. Use that full URL instead of the /images/... path
-- =============================================================================
