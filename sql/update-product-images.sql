-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- This updates the first 3 products with real images from the /images folder

-- Update Our Street at Dusk (380 INR) with First part photo.jpg
UPDATE products
SET image_url = '/images/First%20part%20photo.jpg'
WHERE title = 'Our Street at Dusk' AND price_inr = 380;

-- Update Monsoon in Marigold (1200 INR) with First part photo and product 950rs.jpg
UPDATE products
SET image_url = '/images/First%20part%20photo%20and%20product%20950rs.jpg'
WHERE title = 'Monsoon in Marigold' AND price_inr = 1200;

-- Update Terracotta Bird Set (650 INR) with first part photo and product 650rs.jpg
UPDATE products
SET image_url = '/images/first%20part%20photo%20and%20product%20650rs.jpg'
WHERE title = 'Terracotta Bird Set' AND price_inr = 650;

-- Optional: Update remaining products with other available images
-- UPDATE products
-- SET image_url = '/images/First%20part%20photo%20and%20product%20200rs.jpg'
-- WHERE title = 'City of Kites' AND price_inr = 450;
--
-- UPDATE products
-- SET image_url = '/images/First%20part%20photo%20and%20product%20200rs.jpg'
-- WHERE title = 'Grandmother''s Garden' AND price_inr = 1800;
--
-- UPDATE products
-- SET image_url = '/images/First%20part%20photo%20and%20product%20200rs.jpg'
-- WHERE title = 'Woven Wall Hanging' AND price_inr = 900;
