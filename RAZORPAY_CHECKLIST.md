# Razorpay Setup Checklist

Quick reference for getting payments live. Follow the steps in order.

---

## Phase 1: Account & Test Keys (Today - 30 min) ⚡

- [ ] Go to https://razorpay.com → Sign up
- [ ] Complete email & phone verification
- [ ] Confirm you're in **Test Mode** ✅
- [ ] Go to Settings → API Keys
- [ ] Copy **Test Key ID** (starts with `rzp_test_`)
- [ ] Copy **Test Key Secret** (starts with `rzp_test_`)
- [ ] Open `.env` file (or create from `.env.example`)
- [ ] Add Razorpay keys to `.env`:
  ```
  RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
  RAZORPAY_KEY_SECRET=rzp_test_YOUR_KEY_SECRET
  SUPABASE_URL=https://kvlqqsvyrspxbumoadxn.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
  ```
- [ ] Update `js/config.js` with Test Key ID:
  ```javascript
  export const RAZORPAY_KEY_ID = 'rzp_test_YOUR_KEY_ID'
  ```
- [ ] Save files (`.env` won't be committed — it's in `.gitignore`)
- [ ] Run `vercel dev` to start local server
- [ ] Open http://localhost:3000

---

## Phase 2: Test Payment Flow (Today - 20 min) 🧪

### Test Checkout (Products):
- [ ] Add products to cart
- [ ] Click Cart → "Checkout & pay"
- [ ] If not signed in: Create test account
- [ ] Razorpay checkout opens
- [ ] Use test card:
  ```
  4111 1111 1111 1111
  Expiry: Any future date
  CVV: Any 3 digits
  ```
- [ ] Complete payment ✅
- [ ] See success toast
- [ ] Check Supabase: `orders` table has new order
- [ ] Check Admin dashboard: Order appears

### Test Donation:
- [ ] Go to Donate section (homepage)
- [ ] Enter amount (e.g., ₹100)
- [ ] Click "Donate with Razorpay"
- [ ] Use same test card
- [ ] Complete donation ✅
- [ ] Check Supabase: `donations` table has new entry

### Troubleshoot if payment fails:
- [ ] Check browser console (F12 → Console)
- [ ] Verify `.env` has correct keys
- [ ] Verify `vercel dev` is running
- [ ] Try card again: `4111 1111 1111 1111`
- [ ] Check Razorpay dashboard → Payments section

**Status after Phase 2:**
- ✅ Test payments working
- ✅ Database saving orders correctly
- ✅ Admin can see orders

---

## Phase 3: Get Production Ready (24-48 hours) 📋

### Complete Razorpay KYC:
- [ ] Go to Razorpay dashboard → Settings → Profile
- [ ] Complete business verification (KYC)
  - [ ] Upload business registration
  - [ ] Upload ID proof
  - [ ] Upload address proof
  - [ ] Add bank details
- [ ] Wait for Razorpay approval (24-48 hours)
- [ ] Check email for approval notification

### Get Live Keys:
- [ ] Once KYC approved, go to Settings → API Keys
- [ ] Click **Live Keys** tab
- [ ] Copy **Live Key ID** (starts with `rzp_live_`)
- [ ] Copy **Live Key Secret** (starts with `rzp_live_`)

---

## Phase 4: Deploy to Production (5 min) 🚀

### Update Vercel Environment Variables:
- [ ] Go to Vercel Dashboard → artisan-impact project
- [ ] Click Settings → Environment Variables
- [ ] Add these for **Production** environment:
  ```
  RAZORPAY_KEY_ID = rzp_live_YOUR_LIVE_KEY_ID
  RAZORPAY_KEY_SECRET = rzp_live_YOUR_LIVE_KEY_SECRET
  SUPABASE_URL = https://kvlqqsvyrspxbumoadxn.supabase.co
  SUPABASE_SERVICE_ROLE_KEY = YOUR_SERVICE_ROLE_KEY
  ```
- [ ] Save changes

### Update Client-Side:
- [ ] Open `js/config.js`
- [ ] Change to Live Key ID:
  ```javascript
  export const RAZORPAY_KEY_ID = 'rzp_live_YOUR_LIVE_KEY_ID'
  ```

### Commit & Deploy:
- [ ] Run in terminal:
  ```bash
  cd /Users/sachink/Documents/Projects/artisan-impact
  git add js/config.js
  git commit -m "Switch Razorpay to production keys"
  git push
  vercel --prod
  ```
- [ ] Wait for Vercel deployment to complete
- [ ] Check deployment was successful

---

## Phase 5: Test Live Payments ✅

### Test with Real Card:
- [ ] Go to your live site (artisan-impact.vercel.app)
- [ ] Add products and checkout
- [ ] **Use real payment card** (or Razorpay test cards still work)
- [ ] Complete payment ✅
- [ ] Check Razorpay dashboard → Payments (see real transaction)
- [ ] Check Supabase `orders` table (see real order)
- [ ] Check Admin dashboard (see real order)

### You're Live! 🎉
- [ ] Payments are now processing
- [ ] Funds will settle to your bank account
- [ ] Monitor orders via Admin dashboard
- [ ] Email confirmations (optional — set up next)

---

## Optional: Email Confirmations 📧

After live payments are working, add email confirmations:
- [ ] Set up Resend or SendGrid
- [ ] Update `api/verify-payment.js` to send email
- [ ] Test email flow
- [ ] Deploy

---

## Helpful Links

| Page | Link |
|------|------|
| Razorpay Dashboard | https://app.razorpay.com |
| API Keys | https://app.razorpay.com/settings/api-keys |
| Payments | https://app.razorpay.com/app/payments |
| Razorpay Docs | https://razorpay.com/docs/ |
| Supabase Dashboard | https://app.supabase.com |
| Vercel Dashboard | https://vercel.com |
| Your Project | http://localhost:3000 |

---

## Contact

**Need help?**
- Read: `RAZORPAY_SETUP.md` (detailed guide)
- Read: `CLAUDE.md` (overall project status)
- Check: Browser console for errors (F12)
- Contact Razorpay: support@razorpay.com

---

**Last Updated:** September 2026
**Project:** Artisan Impact
**Status:** Ready for payment integration
