# Artisan Impact

Shop, blog, donations, and volunteer signup for a children's art program.
Static frontend + Vercel serverless backend + Supabase database + Razorpay payments.

## Project structure

```
index.html            → all page markup
css/style.css          → styling
js/
  supabaseClient.js     → Supabase connection (fill in your keys)
  config.js              → Razorpay public key (fill in)
  cart.js                 → cart state (localStorage)
  shop.js                 → loads products from Supabase, renders grid + filters
  checkout.js             → cart → Razorpay → verify → order confirmed
  donate.js               → custom-amount donation → Razorpay → verify
  volunteer.js            → volunteer form → Supabase insert
  main.js                  → wires everything up on page load
api/
  create-order.js        → Vercel function: creates a Razorpay order (server-side)
  verify-payment.js       → Vercel function: verifies payment + writes to Supabase
sql/schema.sql          → run this once in Supabase to create your tables
```

The `api/` folder only works when served through Vercel (locally via `vercel dev`,
or once deployed). Opening `index.html` directly in a browser will NOT run the
checkout backend — the shop grid and volunteer form will still work since those
talk to Supabase directly, but "Checkout & pay" and "Donate" will fail until you
run it through Vercel.

## 1. Supabase setup

1. supabase.com → your project → **SQL Editor** → paste in the contents of
   `sql/schema.sql` → Run. This creates your tables and drops in 6 sample products.
2. Project Settings → API → copy your **Project URL** and **anon public** key.
3. Paste both into `js/supabaseClient.js` (replace the two placeholder strings).
4. Project Settings → API → copy the **service_role** key too (different from
   anon — keep this one secret, never put it in any client-side file). You'll
   need it for step 3 below.

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
2. Razorpay's test checkout opens — use their test card `4111 1111 1111 1111`,
   any future expiry, any CVV, any name
3. On success you should see the confirmation toast, and a new row in your
   Supabase `orders` and `order_items` tables
4. Try the donate form and the volunteer form the same way

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

## Going live for real (not just testing)

- Switch Razorpay from Test Mode to Live Mode, generate live API keys, and
  swap them into `js/config.js` and your Vercel env vars
- Consider adding email confirmations (e.g. via Resend or Supabase Edge
  Functions) after a successful order
- Add real product photos by uploading to Supabase Storage and pasting the
  public URL into the `image_url` column instead of `null`
