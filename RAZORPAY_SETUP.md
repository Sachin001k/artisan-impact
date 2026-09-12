# Razorpay Payment Gateway Setup Guide

Complete guide to integrate Razorpay payments into Artisan Impact.

---

## 📋 Overview

Your app has a complete payment system ready. You just need to:
1. Create a Razorpay account
2. Get API keys
3. Add them to your project
4. Test payments
5. Go live

**Cost:** Razorpay charges 2% + ₹3 per transaction (in India). No monthly fees.

---

## Step 1️⃣ Create Razorpay Account

1. Go to **https://razorpay.com**
2. Click **"Sign Up"** (top right)
3. Choose **"Business"** account type
4. Enter your details:
   - Email
   - Phone (Indian number recommended)
   - Business name (Artisan Impact)
   - Business type (Non-profit / Education)
5. Verify email and phone (OTP)
6. Complete KYC (identity verification) — required for Indian businesses
7. Dashboard opens → You're in **Test Mode** by default ✅

---

## Step 2️⃣ Get Your API Keys (Test Mode)

### In Razorpay Dashboard:

1. Go to **Settings** (gear icon, top right)
2. Click **API Keys** (left sidebar)
3. You'll see two tabs: **Test Keys** and **Live Keys**
4. Make sure **Test Keys** tab is active
5. You'll see:
   - **Key ID** (starts with `rzp_test_`) ← Copy this
   - **Key Secret** (long string) ← Copy this

⚠️ **Important:** Key Secret is private — never share it or commit it to Git!

---

## Step 3️⃣ Add Keys to Your Project

### For Local Testing (using `vercel dev`):

1. Open `.env` file (in project root)
   - If it doesn't exist, copy from `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Add your Razorpay keys:
   ```env
   RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
   RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET_HERE
   
   SUPABASE_URL=https://kvlqqsvyrspxbumoadxn.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. Also update the client-side key in `js/config.js`:
   ```javascript
   export const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID_HERE'
   ```

4. Save files

**Your `.env` is in `.gitignore` — it will never be committed** ✅

---

## Step 4️⃣ Test Payments Locally

### Start development server:
```bash
cd /Users/sachink/Documents/Projects/artisan-impact
vercel dev
```

Open **http://localhost:3000** in browser

### Test the checkout flow:

1. **Add products to cart**
   - Click "Shop" → Add some products to cart

2. **Go to checkout**
   - Click "Cart" (top right) → "Checkout & pay"

3. **Sign in** (if not already)
   - Create a test account or sign in with existing one

4. **Razorpay checkout opens**
   - Use this test card:
     ```
     Card Number:  4111 1111 1111 1111
     Expiry:       Any future date (e.g., 12/25)
     CVV:          Any 3 digits (e.g., 123)
     Name:         Any name
     ```

5. **Payment completes**
   - You should see a success toast ✅
   - Check Supabase → `orders` table → New order should appear
   - Check admin dashboard for the order

### If payment fails:

1. **Check browser console** (F12 → Console tab)
   - Look for error messages

2. **Check that Razorpay keys are correct** in `.env`

3. **Check that `vercel dev` is running** (not just `npx serve .`)
   - Backend functions need to run for payments to work

4. **Check Razorpay dashboard** → Payments section
   - You should see test payment attempts

---

## Step 5️⃣ Test Donation (No Sign-in Required)

1. Go to **http://localhost:3000** → Scroll to "Donate" section
2. Enter any amount (e.g., ₹100)
3. Click "Donate with Razorpay"
4. Use same test card as above
5. Success → Check Supabase `donations` table for new entry

---

## Step 6️⃣ Go Live with Production Keys

### ⚠️ Prerequisites:
- Complete Razorpay KYC (identity verification)
- Have at least 1 successful test transaction
- Business details verified

### In Razorpay Dashboard:

1. Go to **Settings** → **API Keys**
2. Click **Live Keys** tab
3. You may need to upgrade to "Production" account
4. Once available, copy:
   - **Live Key ID** (starts with `rzp_live_`)
   - **Live Key Secret** (starts with `rzp_live_`)

### Update Production Environment Variables:

1. Go to **Vercel Dashboard** → Your project (artisan-impact)
2. Click **Settings** → **Environment Variables**
3. Add for **Production** environment:
   ```
   RAZORPAY_KEY_ID = rzp_live_YOUR_LIVE_KEY_ID
   RAZORPAY_KEY_SECRET = rzp_live_YOUR_LIVE_KEY_SECRET
   SUPABASE_URL = https://kvlqqsvyrspxbumoadxn.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
   ```

4. Save changes

### Update Client-Side Key:

Edit `js/config.js`:
```javascript
export const RAZORPAY_KEY_ID = 'rzp_live_YOUR_LIVE_KEY_ID'
```

### Deploy to Production:

```bash
cd /Users/sachink/Documents/Projects/artisan-impact
git add js/config.js
git commit -m "Update Razorpay to production keys"
git push

vercel --prod
```

Vercel will automatically use the Production environment variables you set.

### Test Live Payments:

1. Go to your live site (artisan-impact.vercel.app or custom domain)
2. Add products and checkout
3. **Use real payment card** (or Razorpay test cards still work in live mode)
4. Check Razorpay dashboard → Payments to see transaction
5. Check Supabase `orders` table for the real order

---

## 📊 Understanding the Payment Flow

```
Customer adds products
        ↓
Customer clicks "Checkout & pay"
        ↓
Sign-in modal (if not logged in)
        ↓
Customer signs in/creates account
        ↓
api/create-order.js runs (backend)
  ├─ Creates a Razorpay order
  └─ Returns order ID to frontend
        ↓
Razorpay checkout widget opens (frontend)
  ├─ Customer enters card details
  └─ Razorpay processes payment
        ↓
Customer completes/fails payment
        ↓
api/verify-payment.js runs (backend)
  ├─ Verifies payment with Razorpay
  ├─ Saves order to Supabase
  └─ Clears customer's cart
        ↓
Success toast shown to customer
        ↓
Order appears in:
  ├─ Customer's "My Account" page
  ├─ Admin dashboard
  └─ Supabase "orders" and "order_items" tables
```

---

## 💰 Test vs Live Mode Differences

| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| Test card works | ✅ Yes | ❌ No |
| Real charges | ❌ No | ✅ Yes |
| Funds received | ❌ No | ✅ Yes (after settlement) |
| Daily limit | None | Based on Razorpay approval |
| Setup time | 5 minutes | 24-48 hours (KYC) |

---

## 🔒 Security Best Practices

✅ **Always do this:**
- Keep `RAZORPAY_KEY_SECRET` only in `.env` and Vercel (never in Git or client-side code)
- Use HTTPS only (Vercel provides this automatically)
- Verify payments on backend (api/verify-payment.js already does this)

❌ **Never do this:**
- Put `RAZORPAY_KEY_SECRET` in `js/config.js` or any client-side file
- Commit `.env` to Git (it's in `.gitignore` for safety)
- Share API keys in screenshots or Slack

---

## 🐛 Troubleshooting

### Payment says "Failed" but I charged the card:
1. Check Razorpay dashboard → Payments section
2. Look for the failed payment
3. Razorpay may auto-refund within 24 hours
4. Contact Razorpay support if not refunded

### "Order creation failed" error:
- Check browser console for error details
- Verify `.env` has correct Razorpay keys
- Make sure `vercel dev` is running (not just `npx serve .`)
- Check that Supabase connection is working

### "Payment verification failed":
- This means Razorpay couldn't verify the payment
- Usually means keys don't match between frontend and backend
- Check that `RAZORPAY_KEY_SECRET` is correct in `.env`

### Test card shows "Your card was declined":
- Make sure you're in **Test Mode** (not Live Mode)
- Try card: `4111 1111 1111 1111`
- Make sure expiry is in the future
- Try a different CVV

### Payment works locally but fails on production:
1. Go to Vercel → Settings → Environment Variables
2. Verify Production env vars are set correctly
3. Redeploy: `vercel --prod`
4. Check Vercel deployment logs for errors

---

## 📞 Support

**Razorpay Support:**
- Email: support@razorpay.com
- Dashboard chat: Click "?" icon in Razorpay dashboard
- Phone: +91-120-4545454 (9:30 AM - 6:30 PM IST)

**Key Resources:**
- Razorpay Docs: https://razorpay.com/docs/
- Payment Widget Docs: https://razorpay.com/docs/payments/
- API Reference: https://razorpay.com/docs/api/

---

## ✅ Next Steps After Setup

1. ✅ Create Razorpay account
2. ✅ Get Test Mode keys
3. ✅ Add to `.env` and `js/config.js`
4. ✅ Test payment flow with test card
5. ✅ Get Live Mode keys (after KYC)
6. ✅ Add to Vercel environment variables
7. ✅ Deploy to production
8. ✅ Test with real payment
9. → **You're live!** 🎉

---

## 💡 Estimated Timeline

- Create account: 10 minutes
- Set up test mode: 15 minutes
- Test payments: 20 minutes
- Complete KYC: 24-48 hours
- Get live keys: 24 hours after KYC
- Deploy to production: 5 minutes
- **Total: ~3 days (mostly waiting for Razorpay KYC)**

---

## 📝 Current Project Status

- ✅ Backend payment functions ready (`api/create-order.js`, `api/verify-payment.js`)
- ✅ Frontend checkout flow ready (`js/checkout.js`, `js/donate.js`)
- ✅ Database tables ready (orders, order_items, donations)
- ✅ Supabase connected
- ⏳ Razorpay API keys needed (this guide!)
- ⏳ Test payment flow
- ⏳ Deploy to production
- ⏳ Go live!

---

**Questions?** Refer to CLAUDE.md for overall project status, or RAZORPAY_SETUP.md (this file) for payment-specific help.
