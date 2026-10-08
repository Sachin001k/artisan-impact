# Payments (Razorpay)

How checkout works, how to test it, and how to go live.

## How it works

1. The customer's browser sends the cart (product ids and quantities only) to `api/create-order.js`.
2. The server prices the cart from the `products` table and creates a Razorpay order for that amount.
3. Razorpay's popup takes the payment (UPI, cards, netbanking, wallets).
4. `api/verify-payment.js` checks Razorpay's signature, fetches the order from Razorpay to confirm what was
   actually paid, re-prices the cart, and only then writes the `orders` / `order_items` (or `donations`) rows.

The browser is never trusted with prices or with saying "this was paid".

## Test it locally (Test Mode — no real money)

```bash
npm run dev        # opens http://localhost:8000 (or the next free port)
```

Add something to the cart → **Checkout & pay** → sign in → **Pay**. In the Razorpay popup use one of:

| Method | What to enter |
|---|---|
| **Netbanking** (easiest) | Any bank → click **Success** on the test bank page |
| **Card** | Visa `4386 2894 0766 0153` or Mastercard `2305 3242 5784 8228`, any future expiry, any CVV, OTP `123456` |
| **UPI** | `success@razorpay` (only after UPI is switched on — see below) |

Gotchas we've hit:

- `4111 1111 1111 1111` fails with **"International cards are not supported"** — this account only accepts Indian cards.
- If **"Save this card"** is ticked, Razorpay asks for a *save-card* OTP sent to the customer's phone. Untick it, or click **Skip OTP**.
- No real OTP is ever sent in Test Mode; any number works.
- **No UPI tab?** Razorpay Dashboard → Settings → Payment Methods → turn on **UPI**.

After a successful payment you should see **Order confirmed**, a new `paid` row in Supabase `orders`, the order in
**/admin → Orders**, and in the customer's **/account** (for non-admin accounts).

## Going live

1. Razorpay Dashboard → complete **KYC** and add the bank account for settlements (takes 1–2 days).
2. Settings → API Keys → **Live Mode** → generate keys.
3. Put the live **Key ID** in `js/config.js`.
4. Vercel → Project → Settings → Environment Variables (Production): set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
   to the live values. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set there too.
5. Redeploy (`vercel --prod`).
6. Do one real ₹1 purchase yourself: `sql/test-payment-product.sql` turns one product into a ₹1 test item
   (revert SQL is at the bottom of that file).

**Where the money goes:** Razorpay settles to your KYC bank account, usually T+2 to T+4 working days, minus
~2% + GST per transaction. Track it under Razorpay Dashboard → **Settlements**.
