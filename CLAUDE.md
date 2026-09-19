# Artisan Impact — Project Status & Tasks

## ✅ Completed Features

### Core Platform
- ✅ **Supabase Integration** — Database schema created with tables for products, orders, donations, volunteers, artists, posts, and testimonials
- ✅ **Static Frontend** — Homepage with shop, Art Diaries blog, donation section, volunteer signup, and testimonials
- ✅ **Vercel Deployment** — Backend serverless functions for payment processing and verification
- ✅ **GitHub Actions** — Supabase keep-alive workflow to prevent database pausing

### Shop & Products
- ✅ **Product Grid** — Shop page displays products from Supabase with fallback gradient backgrounds
- ✅ **Product Categories** — Support for "painting", "craft", and "print" categories
- ✅ **Product Filtering** — Filter by category and price range (under ₹1000)
- ✅ **Sample Products** — 6 seed products in database (Monsoon in Marigold, Terracotta Bird Set, City of Kites, Grandmother's Garden, Woven Wall Hanging, Our Street at Dusk)
- ✅ **Cart System** — Add to cart functionality with localStorage persistence
- ✅ **Product Images** — All 6 products now have dummy images from picsum.photos (ready to replace with real images)

### Authentication & User Accounts
- ✅ **Supabase Auth** — Email + password sign-in/sign-up system
- ✅ **Sign-in Modal** — Artistic modal with sign-in and create account tabs
- ✅ **User Metadata** — Full name and phone number collection during signup
- ✅ **Avatar Display** — User initials shown in nav once signed in
- ✅ **Account Page** — `account.html` shows order history, total spent, and order count
- ✅ **My Account Link** — Navigation dropdown with account link and sign out

### Checkout & Payments
- ✅ **Checkout Flow** — Requires sign-in before payment
- ✅ **Razorpay Integration** — Payment processing (Test Mode fully set up with API keys)
- ✅ **Test API Keys** — Razorpay Test Key ID & Secret configured (ready for local testing)
- ✅ **Order Creation** — Backend function creates Razorpay order server-side
- ✅ **Payment Verification** — Backend verifies payment and writes to Supabase `orders` and `order_items` tables
- ✅ **Order Confirmation** — Toast notification on successful payment
- ✅ **Cart Clearing** — Customer cart automatically cleared after successful payment
- ⏳ **Payment Testing** — Need to test checkout flow end-to-end (see TODO below)

### Admin Dashboard
- ✅ **Admin Login** — Separate admin authentication (email from `admins` table)
- ✅ **Dashboard Access Control** — Only emails in `admins` table can view dashboard
- ✅ **Orders View** — Display paid orders, revenue totals, and order details
- ✅ **Donations View** — Show donation history with amounts and donor emails
- ✅ **Volunteer Signups** — List of volunteer applications with interests and messages
- ✅ **Review Moderation** — Approve/reject customer reviews before public display
- ✅ **Activity Tracking** — "Added to cart" event logging for product analytics
- ✅ **Product Management** — Admin interface for viewing and managing products

### Art Diaries Blog
- ✅ **Blog System** — Posts stored in `posts` table with slug, title, content, and gradients
- ✅ **Featured Post** — Homepage displays latest post prominently
- ✅ **Post Feed** — Next 4 posts shown in carousel below featured post
- ✅ **Post Page** — `post.html` displays individual blog entries
- ✅ **Artist Bios** — Posts linked to artist entries

### Artist Pages
- ✅ **Artist Bio Pages** — `artist.html?id=<artist_id>` shows artist bio and products
- ✅ **QR Code Generation** — Printable QR codes on artist pages (via api.qrserver.com)
- ✅ **Product Listings** — Each artist page shows their products with prices

### Donations
- ✅ **Donation Form** — Custom amount donation without sign-in requirement
- ✅ **Razorpay Payments** — Donation processing via Razorpay (Test Mode)
- ✅ **Donation Tracking** — All donations logged to Supabase `donations` table

### Volunteer Management
- ✅ **Volunteer Form** — Signup form with name, email, interest area, and message
- ✅ **Database Storage** — Volunteer applications saved to Supabase `volunteers` table
- ✅ **Admin View** — Volunteers visible in admin dashboard

### Reviews & Testimonials
- ✅ **Review Form** — Customers can submit reviews on homepage
- ✅ **Moderation** — New reviews default to `approved = false` (hidden until reviewed)
- ✅ **Admin Approval** — Admin can flip `approved` to `true` in Supabase Table Editor
- ✅ **Public Display** — Approved reviews shown on homepage in testimonials section

### Design & UI
- ✅ **Responsive Layout** — Mobile-friendly design across all pages
- ✅ **Color Scheme** — Vibrant gradient-based colors (poppy red, cobalt blue, teal, marigold, violet)
- ✅ **Navigation Bar** — Logo, links to Shop/Art Diaries/Donate/About, Sign in, Cart
- ✅ **Professional Styling** — CSS framework with consistent typography and spacing
- ✅ **Profile Photo** — Hero image with artist impact story
- ✅ **Modal UI** — Sign-in/signup modal with improved aesthetics

### Infrastructure
- ✅ **Vercel Hosting** — Frontend + serverless backend deployed
- ✅ **Environment Variables** — Support for RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE credentials
- ✅ **Clean URLs** — Vercel rewrites configured for clean URLs
- ✅ **Row Level Security** — Supabase RLS policies protect customer data

---

## ⏳ TODO — Next Steps

### 1. **Test Payment Flow End-to-End** 🔴 HIGH PRIORITY
   - **Current Status:** Payment infrastructure ready but untested
   - **⚠️ KNOWN GOTCHA #1 — Wrong dev server gives "Could not start checkout":**
     Running `npm run dev` starts a plain **static file server** (`http-server`)
     on port 8000. That server has no backend at all — `/api/create-order`
     and `/api/verify-payment` don't exist there — so any payment attempt
     fails with "Could not start checkout. Please try again in a moment."
     **Always use `vercel dev` instead** (usually port 3000/3001+) — that's
     the only server that runs the Razorpay backend functions locally.
   - **⚠️ KNOWN GOTCHA #2 (FIXED Sep 2026) — `FUNCTION_INVOCATION_FAILED` even
     on `vercel dev`:** `api/create-order.js` and `api/verify-payment.js` use
     ES module syntax (`import`/`export`), but `package.json` had no `"type":
     "module"` field. Node's own CLI silently reparses ambiguous files like
     this, but Vercel's serverless runtime does not — it crashed with a bare
     500 `FUNCTION_INVOCATION_FAILED` and no useful client-side error.
     **Fix:** added `"type": "module"` to `package.json`. Verified safe — no
     file in the repo uses CommonJS (`require`/`module.exports`). If payments
     ever start failing again with this exact error after editing `package.json`,
     check that field wasn't accidentally removed.
   - **Tasks:**
     1. Start local server: `vercel dev` (NOT `npm run dev`)
     2. Open the URL it prints (e.g. http://localhost:3001)
     3. Add 2-3 products to cart
     4. Click Cart → "Checkout & pay" → lands on `checkout.html`
     5. Sign in (create test account if needed)
     6. Click "Pay now" → complete Razorpay checkout with test card:
        ```
        Card: 4111 1111 1111 1111
        Expiry: Any future date
        CVV: Any 3 digits
        ```
     7. Verify:
        - ✅ In-page success confirmation appears (checkout.html step 3)
        - ✅ Order saved to Supabase `orders` table
        - ✅ Cart cleared after payment
        - ✅ Order appears in admin dashboard
        - ✅ Order visible in customer's account page
   - **Also test:**
     - Donation flow (no sign-in required)
     - Mobile checkout (responsive)
     - Payment failure handling
   - **Guide:** See `RAZORPAY_SETUP.md` and `PAYMENT_TESTING.md` for detailed test instructions

### 1b. **Payment Methods (UPI / GPay / PhonePe / Cards / Netbanking)** ✅ ALREADY SUPPORTED
   - **Decision (Sep 2026):** Use Razorpay's **Standard Checkout** popup as-is,
     rather than building a fully custom payment-methods page. Rationale:
     Standard Checkout already renders UPI (with GPay/PhonePe/Paytm app
     buttons on mobile, or a scannable QR code on desktop), Cards, Netbanking,
     and Wallets as tabs in one modal — with zero extra code — and Razorpay
     handles PCI-DSS compliance for card data. A fully custom-branded payment
     page was considered but rejected for now: it would take 3-5+ days
     (separate flows per method, 3-D Secure redirects, UPI status polling)
     for a purely cosmetic improvement over Razorpay's popup.
   - **Verified in code:** Neither `js/checkout-page.js`, `js/donate.js`, nor
     `api/create-order.js` set a `method` restriction on the Razorpay options,
     so all payment methods Razorpay supports for this account are shown by
     default. No code change was needed for this — only the dev-server fix
     above (1.) was blocking it from ever opening.
   - **To confirm it's working:** Once running via `vercel dev`, click "Pay
     now" on `checkout.html` — the Razorpay modal should show tabs for
     UPI / Card / Netbanking / Wallet. On a real phone with GPay or PhonePe
     installed, those show as one-tap app buttons under the UPI tab.
   - **Revisit later if:** the team decides Razorpay's popup branding is a
     dealbreaker — then build Option B (custom tabbed payment page) as a
     separate project, reusing Razorpay's JS SDK underneath for security.
   - **⚠️ UPI tab missing (Sep 2026):** on a brand-new Razorpay account, the
     checkout modal only showed Cards / Netbanking / Wallet — no UPI tab at
     all. This is a **dashboard setting**, not a code issue: go to Razorpay
     Dashboard → **Settings → Payment Methods** and toggle **UPI** on. Once
     enabled, UPI appears as its own tab with a dynamic QR (desktop) or
     one-tap GPay/PhonePe/Paytm buttons (mobile, if those apps are installed).
   - **⚠️ Test card OTP never arrives:** this is expected — Test Mode only
     works with Razorpay's official fake card `4111 1111 1111 1111` (any
     future expiry, any 3-digit CVV, any digits for OTP if asked). A real
     card number typed into Test Mode will never receive a real OTP because
     nothing about a Test Mode transaction is real.
   - **Decision (Sep 2026) — rejected a custom "personal UPI QR" system:**
     considered letting the merchant upload their own PhonePe/GPay QR code
     for customers to scan directly, bypassing Razorpay. **Rejected** —
     the site would have no way to detect if/when a scan-to-pay actually
     succeeded (no automatic order confirmation, manual reconciliation
     forever, real risk of a customer claiming payment that never
     happened). Razorpay's own UPI (once the toggle above is on) already
     gives a dynamic per-order QR that's auto-verified exactly like cards —
     strictly better, and free.
   - **💰 Where does the money actually go?**
     - **Test Mode (current state):** zero real money moves, ever. No card
       is charged, no bank account is touched — it's a full simulation.
     - **Live Mode (after completing KYC):** customer payments are collected
       by Razorpay, then **settled to the bank account added during KYC**
       (Razorpay Dashboard → Settings → Bank Account), typically **T+2 to
       T+4 working days** after each transaction, minus Razorpay's fee
       (~2% + GST per transaction). Track settlements in Razorpay Dashboard
       → **Settlements**.

### 1c. **₹1 Test Payment Product** ✅ READY TO USE
   - **Purpose:** a cheap, safe way to confirm payments really work once you
     switch to Razorpay Live Mode, without risking a real product's price.
     ₹1 (100 paise) is Razorpay's minimum chargeable amount — the cheapest
     possible real-money test.
   - **Setup:** run `sql/test-payment-product.sql` in Supabase SQL Editor.
     It repurposes the existing "Grandmother's Garden" row into:
     - Title: `Test Payment — Do Not Buy`
     - Price: `₹1`
     - Image: `images/test-payment.svg` (a plain "TEST PAYMENT — ₹1" graphic,
       created for this purpose — not a real product photo)
   - **To revert** back to the real "Grandmother's Garden" listing, run the
     commented-out `UPDATE` at the bottom of the same SQL file.
   - **Use it to test:** in Test Mode with fake cards/UPI first (free), then
     once in Live Mode, do one real ₹1 purchase yourself to confirm money
     actually settles to your bank account before trusting it with real
     customers.

### 2. **Improve Payment UI/UX** 🟡 MEDIUM PRIORITY
   - **Current Status:** ✅ Dedicated checkout page built (Sep 2026)
     - `checkout.html` + `js/checkout-page.js` replaced the old inline
       Razorpay-modal-on-homepage flow. "Checkout & pay" now navigates to
       its own page with:
       - ✅ Step indicator (Cart → Review & Pay → Confirmed)
       - ✅ Order summary listing every item + total before paying
       - ✅ Sign-in prompt inline if not logged in
       - ✅ Processing overlay (spinner) while payment verifies
       - ✅ In-page success confirmation (no more toast) with payment ID
         and links to "Continue shopping" / "View my orders"
   - **Still remaining (optional polish):**
     1. **Shipping/address collection** — not yet collected anywhere;
        add a step to `checkout.html` if physical delivery needs an address
     2. **Better error messages** — currently a plain `alert()` on failure;
        replace with an inline error banner matching the site's style
     3. **Invoice/Receipt email** — generate and email order receipt
        (needs an email provider — see Task 6)
   - **Files:** `checkout.html`, `js/checkout-page.js`, `js/checkout.js`
   - **See:** `PAYMENT_UI_IDEAS.md` for the original idea list (partially done)

### 3. **Add Product Images (Replace Dummy Images)** 🟡 MEDIUM PRIORITY
   - **Current Status:** All 6 products have dummy picsum.photos images
   - **Available Images in `/images` folder:**
     - `first-part-photo-and-product-200rs.jpg` (320 KB)
     - `first-part-photo-and-product-650rs.jpg` (148 KB)
     - `first-part-photo-and-product-950rs.jpg` (91 KB)
     - `first-part-photo.jpg` (341 KB)
   - **⚠️ Renamed Sep 2026:** all files in `/images` were renamed to remove
     spaces (e.g. `First part photo.jpg` → `first-part-photo.jpg`). `vercel
     dev`'s static file server 404s on any filename containing a space, even
     URL-encoded (`%20`) — confirmed by curling both forms directly. `About
     us Mihir photo.png` → `about-us-mihir-photo.png` was the first one hit
     (it's why the About section photo wasn't loading) and `index.html` was
     updated to match. **Always use spaces-free filenames for anything in
     `/images` going forward.**
   - **Excluded images:** `logo.jpeg`, `About us Mihir photo.png` (used elsewhere)
   
   **To replace dummy images:**
   1. Option A: Upload to Supabase Storage (recommended for production)
      - Supabase → Storage → Create bucket `products`
      - Upload 4 images
      - Get public URLs
      - Update `products` table `image_url` column with Supabase URLs
   
   2. Option B: Use local `/images/` folder
      - Update product rows with paths like `/images/First%20part%20photo.jpg`
      - Requires static file serving
   
   3. Option C: Re-run SQL script
      - Edit `sql/update-product-images.sql` with your image URLs
      - Run in Supabase SQL Editor

### 4. **Razorpay Live Mode Activation** 🟡 MEDIUM PRIORITY
   - **Current Status:** Test Mode active with API keys configured
   - **Prerequisites:**
     - Complete Razorpay KYC (Identity verification) → 24-48 hours
     - Pass 1-2 test transactions ✅ (see Task 1 above)
   
   - **When ready for production:**
     1. Razorpay dashboard → Settings → API Keys → **Live Keys** tab
     2. Complete business verification (KYC)
     3. Copy Live Key ID & Secret
     4. Update `js/config.js` with Live Key ID
     5. Update Vercel env vars (Production) with Live Key Secret
     6. Redeploy: `vercel --prod`
     7. Test with real payment
   - **Guide:** See `RAZORPAY_CHECKLIST.md` for step-by-step

### 4b. **Delivery System** 🔵 DEFERRED — revisit after payments are confirmed working
   - **Status:** Not started, and deliberately deferred (Sep 2026) until
     Task 1 (end-to-end payment testing) and Task 4 (Live Mode) are both
     confirmed working — no point building shipping logic on top of a
     payment flow that isn't verified yet.
   - **What's missing today:** no shipping address is collected anywhere
     in the checkout flow (see Task 2's "Shipping/address collection" note),
     and there's no concept of order status beyond `pending`/`paid`/`failed`
     in the `orders` table — nothing tracks "packed", "shipped", "delivered".
   - **When picked back up, will likely need:**
     1. An address form step in `checkout.html` (name, address, city, pin
        code, phone) saved onto the order
     2. A `shipping_status` column (or a separate `shipments` table) with
        states like `processing` → `shipped` → `delivered`
     3. Admin dashboard controls to update shipping status per order
     4. Customer-facing status on their order in `account.html`
     5. Optional: courier integration (Shiprocket, Delhivery, etc.) or just
        manual status updates to start
   - **Not scoped in detail yet** — this is a placeholder to revisit, not a
     ready-to-build spec.

### 5. **Improve Product Data** 🟢 LOW PRIORITY
   - Add more artist bios and descriptions to `artists` table
   - Link all products to their respective artists via `artist_id`
   - Update sample product titles to match actual artwork
   - Add more product seed data or establish upload workflow for admins
   - Consider creating admin panel for product creation/editing without database access

### 6. **Email Notifications** 🟢 LOW PRIORITY (Optional but recommended)
   - **Order Confirmation Email** → Send to customer after successful payment
   - **Admin Alerts** → Notify admin of new orders, donations, and reviews
   - **Volunteer Confirmation** → Confirm receipt of volunteer application
   - **Solution Options:**
     - Supabase Edge Functions + Resend (recommended)
     - SendGrid or Mailgun integration
     - Gmail API (requires OAuth setup)

### 7. **Domain & SSL** 🟢 LOW PRIORITY
   - Currently at `vercel.app` subdomain
   - **Optional:** Add custom domain through Vercel settings
   - SSL automatically handled by Vercel

### 8. **Advanced Features** 🟢 LOW PRIORITY (Nice-to-have)
   - Product inventory tracking (low stock warnings)
   - Pre-order functionality for limited editions
   - Print/export order invoices as PDF
   - Customer review photos/images
   - Social sharing (Instagram, Facebook integration)
   - Analytics dashboard (views, conversion rates, popular products)
   - Email marketing integration for newsletter
   - Wishlist functionality
   - Discount codes / coupon system

### 9. **Content Updates** 🟢 LOW PRIORITY
   - Add more Art Diaries blog posts (monthly recommended)
   - Update About page with full program description
   - Add program impact stories and student testimonials
   - Create FAQ page
   - Add privacy policy and terms of service

### 10. **Testing & QA** 🔴 BEFORE LAUNCH
   - ⏳ Checkout flow with test card (see Task 1)
   - ⏳ Donation process end-to-end
   - ⏳ Mobile responsiveness on checkout
   - ⏳ Admin dashboard order viewing
   - ⏳ Sign-in/account/order history flow
   - ⏳ Product filtering and search
   - ⏳ Error handling (failed payments, network errors)

### 11. **Performance & SEO** 🟢 LOW PRIORITY
   - Add meta tags for social media (Open Graph)
   - Optimize image loading (lazy loading, compression)
   - Add structured data (Schema.org for products)
   - Monitor Vercel Analytics
   - Set up error tracking (e.g., Sentry)

---

## 🔧 Configuration Summary

### Supabase
- **URL:** `https://kvlqqsvyrspxbumoadxn.supabase.co`
- **Status:** ✅ Connected and functional
- **Tables:** products, orders, order_items, donations, volunteers, artists, posts, testimonials, admins

### Razorpay
- **Status:** ✅ Test Mode API keys configured and ready to test
- **Test Card:** `4111 1111 1111 1111` (any future expiry, any CVV)
- **Next:** Complete end-to-end payment testing (see TODO Task 1)
- **Then:** Complete KYC for Live Mode → Get Live Keys → Deploy to production
- **Next Step:** Generate live keys and activate Live Mode

### Vercel
- **Status:** ✅ Deployed and functional
- **Project Name:** `artisan-impact`
- **Environment:** Set up for Test Mode (needs production env vars for Razorpay live keys)

### GitHub
- **Repo:** Set up with `.gitignore` protecting `.env` files
- **Workflows:** Supabase keep-alive runs twice weekly

---

## 🎯 Priority Order (Recommended)

1. **Add product images** → Makes shop look polished
2. **Set up Razorpay Live Mode** → Enables real payments
3. **Test complete flow** → Order → Payment → Confirmation
4. **Add email notifications** → Better user experience
5. **Custom domain** → Professional branding
6. **More content** → Artist bios, blog posts, testimonials
7. **Advanced features** → Inventory, discounts, analytics

---

## 📝 Notes

- **Security:** All sensitive keys are stored as environment variables on Vercel, never in Git
- **Database:** All data in Supabase with Row Level Security configured
- **Architecture:** Fully static frontend + serverless Vercel functions = no ops overhead
- **Scalability:** Can handle significant traffic with Vercel's auto-scaling and Supabase's reliability

---

## 🤖 Last Updated
Generated by Claude Code — Project documentation as of September 2026
