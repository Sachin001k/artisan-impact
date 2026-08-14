# Artisan Impact

Shop, blog, donations, and volunteer signup for a children's art program.
Static frontend + Vercel serverless backend + Supabase database + Razorpay payments.

## Project structure

```
index.html            → homepage markup (shop, blog, mentors, donate, testimonials, etc.)
artist.html            → one artist's bio + printable QR code + their products
post.html               → a single Art Diaries blog entry
admin.html              → password-protected dashboard (orders, donations, reviews, etc.)
css/style.css          → styling
js/
  supabaseClient.js     → Supabase connection (fill in your keys)
  config.js              → Razorpay public key (fill in)
  cart.js                 → cart state (localStorage) + logs "added to cart" events
  shop.js                 → loads products from Supabase, renders grid + filters
  auth.js                 → Supabase Auth: sign in/up/out + the sign-in modal
  checkout.js             → requires sign-in → cart → Razorpay → verify → order confirmed
  donate.js               → custom-amount donation → Razorpay → verify (no sign-in required)
  volunteer.js            → volunteer form → Supabase insert
  blog.js                  → loads Art Diaries posts onto the homepage
  post.js                  → loads a single Art Diaries post (post.html)
  artist.js                → loads an artist's bio + products + QR code (artist.html)
  testimonials.js          → loads approved reviews + handles the review form
  admin.js                 → admin login + dashboard data (admin.html)
  main.js                  → wires everything up on page load
api/
  create-order.js        → Vercel function: creates a Razorpay order (server-side)
  verify-payment.js       → Vercel function: verifies payment + writes to Supabase
sql/schema.sql          → run this once in Supabase to create your tables
.github/workflows/supabase-keepalive.yml → pings Supabase so it doesn't pause
```

The `api/` folder only works when served through Vercel (locally via `vercel dev`,
or once deployed). Opening `index.html` directly in a browser will NOT run the
checkout backend — the shop grid and volunteer form will still work since those
talk to Supabase directly, but "Checkout & pay" and "Donate" will fail until you
run it through Vercel.

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

By default, a new Supabase project requires email confirmation before a
signed-up account can log in. For faster local testing you can turn this off
at Supabase → **Authentication → Providers → Email → Confirm email**, or
just check the confirmation email it sends.

### Customer "My Account" dashboard

Once someone is signed in, a **My Account** link appears in the nav (also at
`account.html` directly), showing their own order count, total spent, and
order history — pulled live from Supabase, restricted to their own rows by
RLS (`orders`/`order_items` policies check `user_id = auth.uid()`). This is
separate from the site-wide `admin.html` dashboard.

### Admin dashboard

`admin.html` shows paid orders, revenue, donations, volunteer signups,
"added to cart" activity by product, and reviews (with an Approve button for
pending ones) — all read live from Supabase.

Only emails listed in the `admins` table (seeded in `schema.sql` with
`admin@gmail.com`) can see the dashboard; everyone else who signs in there
gets "This account doesn't have admin access." To use it:

1. Open `admin.html`, use the **Create account** tab to sign up with
   `admin@gmail.com` (or whichever email you seeded into `admins`) and a
   password. Confirm the email if your project requires it.
2. Sign in — you should land on the dashboard.
3. To add more admins later, no code changes needed: Supabase → **Table
   Editor** → `admins` → insert a row with the new email (they still need to
   create their own account with that email via the same Create account tab).

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

Install dependencies and the Vercel CLI:

```bash
npm install
npm i -g vercel
```

Link this folder to a Vercel project (creates a `.vercel` folder, harmless):

```bash
vercel link
```

Run everything locally, frontend + backend functions together:

```bash
vercel dev
```

It'll print a local URL (usually `http://localhost:3000`). Open that — `vercel dev`
automatically reads your `.env` file, so `/api/create-order` and `/api/verify-payment`
will work exactly like they will in production.

Test the flow:
1. Add a couple of products to cart → open the cart drawer → Checkout & pay
2. If you're not signed in, the sign-in modal opens instead — create an
   account (or sign in), then click Checkout & pay again
3. Razorpay's test checkout opens — use their test card `4111 1111 1111 1111`,
   any future expiry, any CVV, any name
4. On success you should see the confirmation toast, and a new row in your
   Supabase `orders` and `order_items` tables
5. Try the donate form and the volunteer form the same way (no sign-in needed)

If you just want to eyeball the design without testing payments, `npx serve .`
also works, but the checkout/donate buttons won't complete without `vercel dev`
or a real deployment.

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
