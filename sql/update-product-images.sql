-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- This updates ALL products with dummy images from picsum.photos
-- REPLACE THESE URLS with your actual images when ready!

-- Update all 6 products with unique dummy images
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=1' WHERE title = 'Our Street at Dusk' AND price_inr = 380;
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=2' WHERE title = 'Monsoon in Marigold' AND price_inr = 1200;
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=3' WHERE title = 'Terracotta Bird Set' AND price_inr = 650;
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=4' WHERE title = 'City of Kites' AND price_inr = 450;
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=5' WHERE title = 'Grandmother''s Garden' AND price_inr = 1800;
UPDATE products SET image_url = 'https://picsum.photos/400/300?random=6' WHERE title = 'Woven Wall Hanging' AND price_inr = 900;

-- =============================================================================
-- IMAGE REPLACEMENT GUIDE
-- =============================================================================
-- When you have your actual images, replace the picsum.photos URLs above with:
--
-- Option 1: Local folder paths (if serving from /images):
--   /images/First%20part%20photo.jpg
--
-- Option 2: Supabase Storage URLs (recommended for production):
--   https://YOUR-PROJECT.supabase.co/storage/v1/object/public/products/image-name.jpg
--
-- To get Supabase Storage URL:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create a public bucket named "products"
-- 3. Upload your images
-- 4. Click the image and copy "Public URL"
-- 5. Replace the picsum.photos URLs with your actual Supabase URLs
-- =============================================================================
