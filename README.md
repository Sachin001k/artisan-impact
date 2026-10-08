# Artisan Impact

Shop, blog, donations, and volunteer signup for a children's art program.
Static frontend + Vercel serverless backend + Supabase database + Razorpay payments.

## Project structure

```
index.html             → homepage (shop, donate, reviews, about) — served at /
checkout.html          → /checkout: delivery address (with map) → pay → confirmed
account.html           → /account: order history + delivery status, saved addresses
artist.html, post.html → /artist?id=…, /post?slug=…
admin.html             → /admin: statistics, orders to ship, site images
admin-products.html    → /admin/products: add / edit / delete products
css/                   → style.css (site), address.css (address form), admin-dashboard.css
js/
  supabaseClient.js    → Supabase connection (public anon key)
  config.js            → Razorpay public key
  main.js              → homepage wiring
  shop.js, cart.js     → product grid, cart drawer (localStorage)
  checkout-button.js   → cart drawer "Checkout & pay" → /checkout
  checkout-page.js     → /checkout steps + Razorpay
  addresses.js         → saved-address data + display helpers
  address-form.js      → address form with map (Leaflet + OpenStreetMap, lazy-loaded)
  auth.js, nav.js      → sign-in modal, header dropdown
  account.js           → /account
  admin-dashboard.js   → /admin
  site-images.js, upload.js → admin-changeable homepage images
  track.js             → anonymous visit counting for admin statistics
  donate.js, testimonials.js, blog.js, post.js, artist.js, volunteer.js
  utils.js             → escapeHtml, formatINR, toast
api/
  create-order.js      → prices the cart, checks sign-in + address, creates the Razorpay order
  verify-payment.js    → verifies payment, saves order + shipping address
  _pricing.js          → shared server helpers (not an endpoint)
scripts/dev-server.js  → `npm run dev`: site + api/ locally, clean URLs
sql/                   → run in Supabase SQL Editor (see sql/README.md)
PAYMENTS.md            → testing payments + going live
```

The `api/` folder runs locally through `npm run dev` (see step 4) and on Vercel
once deployed. Opening `index.html` directly as a file will NOT run the checkout
backend — "Checkout & pay" and "Donate" need one of those two.

## 1. Supabase setup

1. supabase.com → your project → **SQL Editor** → paste in the contents of
   `sql/schema.sql` → Run. This creates your tables (`products`, `orders`,
   `order_items`, `donations`, `volunteers`, `artists`, `posts`, `testimonials`)
   and seeds 6 sample products, 6 artists, 5 Art Diaries posts, and 2 sample
   reviews.
2. Project Settings → API → copy your **Project URL** and **anon public** key.
3. Paste both into `js/supabaseClient.js` (replace the two placeholder strings).
4. Project Settings → API → copy the **service_role** key too (different from
   anon — keep this one secret, never put it in any client-side file). You'll
   need it for step 3 below.

### Moderating reviews

New reviews submitted through the "Reviews" section on the homepage are
inserted with `approved = false`, so they never show up publicly until you
review them. In Supabase → **Table Editor** → `testimonials`, flip a row's
`approved` column to `true` to publish it.

### Artist bio pages & QR codes

Each product can link to an `artists` row via `products.artist_id`. When set,
the artist's name on a product card links to `artist.html?id=<artist_id>`,
which shows their bio and a QR code (generated on the fly via api.qrserver.com)
that always points back to that same page — print it on packaging or a shelf
card. To add a new artist, insert a row into `artists`, then set the matching
product's `artist_id`.

### Art Diaries blog

The "Art Diaries" section on the homepage and `post.html` both read from the
`posts` table (`slug`, `title`, `artist_id`, `excerpt`, `content`,
`gradient_from`/`gradient_to`, `published_at`). Add a new monthly entry by
inserting a row — the homepage automatically shows the latest as the featured
diary and the next four underneath.

### Customer sign-in before checkout

Buyers must be signed in (via Supabase Auth, email + password) to complete
a purchase — donations stay guest-friendly. The "Sign in" button in the nav
opens a modal with both "Sign in" and "Create account" tabs; hitting
"Checkout & pay" while signed out opens the same modal automatically, and
the shopper just clicks "Checkout & pay" again once they're in.

"Create account" also asks for **full name** and **phone number** (stored in
Supabase Auth's user metadata — no separate table needed), used to prefill
Razorpay checkout and to show initials once signed in. Once signed in, the
nav shows a small avatar with the person's initials (from their name, or the
first letter of their email if no name is set) instead of the "Sign in"
button — click it to go to `account.html`.

**If sign-in isn't working right after creating an account**: by default, a
new Supabase project requires email confirmation before a signed-up account
can log in — trying to sign in before confirming will show an error like
"Email not confirmed" in the modal. Either check the confirmation email
Supabase sent (may land in spam), or turn confirmation off entirely for
faster testing at Supabase → **Authentication → Providers → Email →
Confirm email**.

### Customer "My Account" dashboard

Once someone is signed in, a **My Account** link appears in the nav (also at
`account.html` directly), showing their own order count, total spent, and
order history — pulled live from Supabase, restricted to their own rows by
RLS (`orders`/`order_items` policies check `user_id = auth.uid()`). This is
separate from the site-wide `admin.html` dashboard.

### Admin dashboard

`admin.html` (also at `/admin`) has three sections:

- **Statistics** — one card showing how many people visited the site, added
  something to their cart, and bought paintings, for this month and all time
- **Orders** — every order with search, status filter and item details
- **Site Images** — upload a new image for the homepage hero, About Me photo,
  the "Process to Product" cards, and every product photo. Uploads go to the
  `site-images` Supabase Storage bucket. To make another spot on the page
  changeable, add it to `IMAGE_SLOTS` in `js/site-images.js` and put
  `data-image-slot="<key>"` on that element in `index.html`.

**Run `sql/stats-and-images.sql` in the Supabase SQL Editor once** — it creates
the visit tracking table, the stats function, the image bucket, and gives admins
permission to edit products (without it, product edits were silently blocked).

Only emails listed in the `admins` table (seeded in `schema.sql` with
`admin@gmail.com`) can see the dashboard. To use it:

1. Create an account with that email from the homepage (Sign in → Create one).
   Confirm the email if your project requires it.
2. Open `/admin` and sign in.
3. To add more admins later: Supabase → **Table Editor** → `admins` → insert a
   row with the new email.

## 2. Razorpay setup

1. dashboard.razorpay.com → sign up → stay in **Test Mode** while developing.
2. Settings → API Keys → Generate Test Key → copy the **Key Id** and **Key Secret**.
3. Paste the **Key Id** into `js/config.js` (safe to expose client-side).
4. Keep the **Key Secret** for the next step — it goes in an env var, never in
   a JS file that ships to the browser.

## 3. Environment variables (for the backend functions)

Copy the template and fill it in:

```bash
cp .env.example .env
```

Fill in `.env` with:
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay
- `SUPABASE_URL` — same project URL as above
- `SUPABASE_SERVICE_ROLE_KEY` — the service_role key from Supabase (not anon)

`.env` is already in `.gitignore` — it will never get pushed to GitHub.

## 4. Test it locally

```bash
npm install
npm run dev
```

`npm run dev` starts `scripts/dev-server.js`, which serves the site **and** runs
the `api/` payment functions (it reads `.env` automatically), so
checkout and donations work locally — no Vercel CLI needed. It opens
`http://localhost:8000` in your browser. URLs never show `.html` (`/checkout`,
`/account`, `/admin`) — old `.html` links redirect; if port 8000 is already taken by
something else, it uses the next free port and prints the URL.
(`npm start` does the same without opening a browser.)

Test the flow:
1. Add a couple of products to cart → open the cart drawer → Checkout & pay
2. Sign in (or create an account) on the checkout page, then click "Pay now"
3. Razorpay's test checkout opens — use their test card `4111 1111 1111 1111`,
   any future expiry, any CVV, any name
4. You should see the in-page confirmation, and a new row in your Supabase
   `orders` and `order_items` tables
5. Try the donate form the same way (no sign-in needed)

## 5. Push to GitHub

```bash
git add .
git commit -m "Add cart, checkout, and backend functions"
git push
```

## 6. Deploy

```bash
vercel --prod
```

Then go to your project on vercel.com → Settings → Environment Variables, and
add the same four values from your `.env` file there (Production environment).
Redeploy after adding them if the first deploy happens before you've set them.

Your live site will be at `your-project.vercel.app` (or a custom domain if you
add one later).

## Keeping Supabase from pausing

Supabase's free tier pauses a project after about a week with no API
activity. `.github/workflows/supabase-keepalive.yml` pings it twice a week
automatically via GitHub Actions, so this only matters if you want it running
sooner or want to double check it's wired up:

1. On GitHub → this repo → **Settings → Secrets and variables → Actions → New
   repository secret**, add:
   - `SUPABASE_URL` — same Project URL as everywhere else
   - `SUPABASE_ANON_KEY` — same anon key as `js/supabaseClient.js`
2. That's it — the workflow runs every Monday and Thursday. You can also
   trigger it manually from the **Actions** tab → "Supabase keep-alive" →
   **Run workflow**, to confirm it's working right after setup.

## Going live for real (not just testing)

- Switch Razorpay from Test Mode to Live Mode, generate live API keys, and
  swap them into `js/config.js` and your Vercel env vars
- Consider adding email confirmations (e.g. via Resend or Supabase Edge
  Functions) after a successful order
- Add real product photos by uploading to Supabase Storage and pasting the
  public URL into the `image_url` column instead of `null`
