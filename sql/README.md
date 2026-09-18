# Artisan Impact — SQL Scripts

This folder contains database setup and management scripts for Artisan Impact.

## Available Scripts

### 1. `schema.sql` — Initial Setup (Run Once)
Sets up all database tables with sample data:
- Creates tables: `products`, `orders`, `order_items`, `donations`, `volunteers`, `artists`, `posts`, `testimonials`, `admins`
- Inserts 6 sample products
- Inserts 4 young artists
- Inserts 5 blog posts
- Inserts 2 sample reviews
- Configures Row Level Security policies

**When to run:** On first setup only

**How to run:**
1. Go to your Supabase project → SQL Editor
2. Click "New Query"
3. Copy-paste the entire contents of `schema.sql`
4. Click "Run"

### 2. `update-product-images.sql` — Add Product Images
Updates product `image_url` fields to point to images in the `/images` folder.

Currently maps:
- `Our Street at Dusk` (₹380) → `/images/First%20part%20photo.jpg`
- `Monsoon in Marigold` (₹1200) → `/images/First%20part%20photo%20and%20product%20950rs.jpg`
- `Terracotta Bird Set` (₹650) → `/images/first%20part%20photo%20and%20product%20650rs.jpg`

Optional commented lines are provided to update remaining products.

**When to run:** After deploying images to production or using local image paths

**How to run:**
1. Go to your Supabase project → SQL Editor
2. Click "New Query"
3. Copy-paste the contents of `update-product-images.sql`
4. Click "Run"

**Note:** If using Supabase Storage (recommended for production), replace the image paths with your Supabase Storage public URLs instead of `/images/...`

---

## Available Images

All images are located in `/images/` folder in your project root:

### Included Images (to use for products):
- `first-part-photo.jpg` — Solo artisan portrait
- `first-part-photo-and-product-200rs.jpg` — Photo with lower-priced product
- `first-part-photo-and-product-650rs.jpg` — Photo with mid-priced product
- `first-part-photo-and-product-950rs.jpg` — Photo with premium product

### Reserved Images (used elsewhere, don't include in products):
- `logo.jpeg` — Used in navigation and headers
- `About us Mihir photo.png` — Used on About page

---

## Recommended: Use Supabase Storage for Production

For a production deployment, upload images to **Supabase Storage** instead of serving from your local `/images/` folder:

1. Go to Supabase dashboard → Storage
2. Create a new public bucket called `products`
3. Upload all images there
4. Get the public URL for each image
5. Update `update-product-images.sql` with the Supabase Storage URLs
6. Run the updated script

Example Supabase Storage URL:
```
https://kvlqqsvyrspxbumoadxn.supabase.co/storage/v1/object/public/products/First%20part%20photo.jpg
```

---

## Modifying Products

To add new products or edit existing ones, use Supabase Table Editor:
1. Go to Supabase → Table Editor
2. Click on `products` table
3. Add new rows or edit existing ones
4. Fields:
   - `title` (text) — Product name
   - `artist` (text) — Artist name and age (e.g., "Ira, age 10")
   - `price_inr` (int) — Price in Indian Rupees
   - `category` (text) — One of: "painting", "craft", "print"
   - `image_url` (text) — URL to product image
   - `artist_id` (uuid) — Foreign key linking to `artists` table (optional)

---

## Row Level Security Policies

All tables have RLS enabled to protect customer data:
- `products` — Public read access (needed for shop)
- `orders` & `order_items` — Restricted to customer's own data
- `orders` & `order_items` writes — Only via service role key (backend)
- `donations` — Written only by service role key (backend)
- `volunteers` — Public insert (anyone can sign up), can't read others' data
- `testimonials` — Public read (shows approved only via UI), admin edit only

---

## Emergency Fixes

If something goes wrong, you can reset specific tables:

### Reset Products (keeps all historical orders/donations):
```sql
DELETE FROM products;

INSERT INTO products (title, artist, price_inr, category, image_url) VALUES
  ('Monsoon in Marigold', 'Aanya, age 11', 1200, 'painting', null),
  ('Terracotta Bird Set', 'Rehan, age 9', 650, 'craft', null),
  ('City of Kites', 'Meher, age 13', 450, 'print', null),
  ('Grandmother''s Garden', 'Simran, age 12', 1800, 'painting', null),
  ('Woven Wall Hanging', 'Dev, age 14', 900, 'craft', null),
  ('Our Street at Dusk', 'Ira, age 10', 380, 'print', null);
```

### Reset Reviews (clears all testimonials):
```sql
DELETE FROM testimonials;

INSERT INTO testimonials (author, title, content, rating, approved) VALUES
  ('Priya M.', 'Beautiful art, faster shipping than expected', 'My daughter loved the print! Framed it immediately. Artisan Impact is doing wonderful work.', 5, true),
  ('Rajesh K.', 'Every purchase supports young artists', 'Worth every rupee. The craft items are intricate and thoughtfully made.', 5, true);
```

⚠️ **Warning:** These operations delete data permanently. Use only if absolutely necessary.

---

## Need Help?

Refer to:
- Main README.md in project root for architecture overview
- CLAUDE.md for project status and next steps
- Supabase docs: https://supabase.com/docs/guides/database
