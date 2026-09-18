# Payment Testing Guide

Complete walkthrough for testing the Razorpay payment flow end-to-end.

---

## ✅ Pre-Testing Checklist

Before you start, make sure:
- [ ] Razorpay Test API keys are in `.env` file
- [ ] `js/config.js` has Test Key ID
- [ ] `.env` has Supabase URL and Service Role Key
- [ ] Terminal is in project directory
- [ ] No errors in browser console (F12)

---

## 🚀 Start Development Server

```bash
cd /Users/sachink/Documents/Projects/artisan-impact
vercel dev
```

You should see:
```
▲ Vercel CLI
> Ready! Available at http://localhost:3000
```

---

## 🛍️ Test 1: Product Checkout

### Step 1: Add Products to Cart
1. Go to **http://localhost:3000**
2. Scroll to **Shop** section
3. Click **"Add to cart"** on 2-3 products
4. Each click should show "Added ✓" briefly
5. Open **Cart** (top right) → Should show items

### Step 2: Proceed to Checkout
1. Click **"Checkout & pay"** button in cart
2. **If not signed in:**
   - Sign-in modal opens
   - Click **"Create account"** tab
   - Enter:
     - Email: `test@example.com`
     - Password: `Test123!` (at least 6 chars)
     - Full name: `Test User`
     - Phone: `9999999999`
   - Click "Create account"
   - Wait for confirmation email (or skip if using Test Supabase)
   - Click **"Checkout & pay"** again
3. **If already signed in:** Razorpay opens immediately

### Step 3: Complete Payment

**Razorpay checkout should open.** You'll see:
- Order amount (sum of products)
- Order ID
- Payment options

**Fill in payment details:**
```
Card Number:  4111 1111 1111 1111
Expiry:       12/25 (or any future date)
CVV:          123 (any 3 digits)
Name:         Any name
Email:        Any email
Phone:        Any phone
```

Click **"Pay"** or **"Complete Payment"**

### Step 4: Verify Success

**You should see:**
1. ✅ Success toast message
2. ✅ Cart cleared (empty cart drawer)
3. ✅ Redirected to confirmation page
4. ✅ Order details displayed

### Step 5: Check Database

Open **Supabase Dashboard** → **Table Editor**

**Check `orders` table:**
- [ ] New row with your order
- [ ] Status: `paid`
- [ ] Total amount correct
- [ ] Created_at shows recent time

**Check `order_items` table:**
- [ ] Rows for each product in your order
- [ ] Quantity correct
- [ ] Product IDs match

### Step 6: Check Admin Dashboard

1. Go to **http://localhost:3000/admin.html**
2. Sign in with admin account (if you have one)
3. Go to **Orders** section
4. **Verify:**
   - [ ] Your order appears in orders list
   - [ ] Order amount is correct
   - [ ] Order status is "paid"
   - [ ] Can click order to see details

### Step 7: Check Customer Account

1. Go to **http://localhost:3000/account.html**
2. Sign in with the test account you used for checkout
3. **Verify:**
   - [ ] Order appears in order history
   - [ ] Total spent is correct
   - [ ] Order count is 1

---

## 💝 Test 2: Donation

### Step 1: Open Donation Section
1. Go to **http://localhost:3000**
2. Scroll to **Donate** section
3. Enter amount: `₹100`
4. Click **"Donate with Razorpay"**

### Step 2: Complete Donation Payment
- Razorpay opens
- Use test card: `4111 1111 1111 1111`
- Complete payment

### Step 3: Verify
**Check Supabase `donations` table:**
- [ ] New row created
- [ ] Amount: 100
- [ ] Created_at recent

---

## 📱 Test 3: Mobile Checkout

### Step 1: Open DevTools
Press **F12** → Click **Device Toolbar** (top left of DevTools)

### Step 2: Select Mobile Device
- Click "Responsive" dropdown
- Select "iPhone 12" or "Pixel 5"

### Step 3: Repeat Checkout Test
1. Add products to cart
2. Click cart
3. Click "Checkout & pay"
4. Complete payment
5. **Verify:**
   - [ ] All buttons are clickable
   - [ ] No text overflow
   - [ ] Forms are easy to fill
   - [ ] Razorpay opens on mobile
   - [ ] Success message shows clearly

---

## ❌ Test 4: Payment Failure Handling

### Try These Test Scenarios:

**Test 1: Declined Card**
- Use card: `4000 0000 0000 0002`
- Should fail with error message
- Check that cart is NOT cleared
- Verify no order created in Supabase

**Test 2: Expired Card**
- Use card: `4000 0000 0000 0069`
- Should fail
- Cart should not be cleared

**Test 3: Invalid CVV**
- Use card: `4111 1111 1111 1111`
- Expiry: valid
- CVV: `000` or invalid
- Should fail

**Test 4: Close Payment Without Completing**
- Start checkout
- Open Razorpay
- Close the modal without paying
- Should return to cart (not cleared)
- No order created in Supabase

### Verify Error Handling:
- [ ] Error message is clear and helpful
- [ ] Cart not cleared if payment fails
- [ ] Can try payment again
- [ ] No duplicate orders created
- [ ] Console shows error details (F12)

---

## 🐛 Debugging Checklist

If something doesn't work:

### Payment Opens but Then Fails:
- [ ] Check browser console (F12 → Console)
- [ ] Look for red error messages
- [ ] Check `.env` file has correct keys
- [ ] Verify `vercel dev` is running (not `npx serve .`)
- [ ] Check Razorpay dashboard → Payments (see what went wrong)

### "Order creation failed":
- [ ] `.env` file has `RAZORPAY_KEY_SECRET`
- [ ] `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Check console for specific error
- [ ] Make sure `vercel dev` is running (backend functions need it)

### "Payment verification failed":
- [ ] This means keys don't match
- [ ] Verify Test Key Secret in `.env` exactly matches Razorpay
- [ ] Restart `vercel dev` after changing `.env`
- [ ] Check Razorpay Test Mode is active (not Live Mode)

### Cart Not Clearing After Payment:
- [ ] Payment might not have completed successfully
- [ ] Check Supabase `orders` table (was order actually created?)
- [ ] If order exists but cart not cleared, it's a frontend bug
- [ ] Check browser console for errors after payment

### Order Not Appearing in Supabase:
- [ ] Check `orders` table exists
- [ ] Check Supabase URL in `.env` is correct
- [ ] Check Service Role Key is correct (not anon key)
- [ ] Check Razorpay dashboard → that payment is listed there

### Sign-in Issues:
- [ ] If "Email not confirmed" error: Supabase may require email verification
- [ ] Go to Supabase → Authentication → Providers → Email
- [ ] Toggle "Confirm email" to OFF for testing
- [ ] Or check the confirmation email (may be in spam)

---

## 📊 What to Verify in Each Database Table

### After Successful Checkout:

**orders table:**
```
id: uuid (auto)
razorpay_order_id: "order_..." (from Razorpay)
customer_email: "test@example.com"
user_id: uuid (your Supabase user)
total_inr: 500 (total amount)
status: "paid"
created_at: today's date
```

**order_items table:**
```
id: uuid (auto)
order_id: (matches orders.id)
product_id: uuid (product that was ordered)
quantity: 1 or more
```

**Check these are correct:**
- [ ] Email matches sign-in account
- [ ] Total amount = sum of products
- [ ] status = "paid" (not "pending" or "failed")
- [ ] Created_at = today
- [ ] Number of order_items = number of products ordered

---

## ✅ Success Criteria

Your payment system is working if:
- ✅ Cart → Checkout → Sign in flows smoothly
- ✅ Razorpay modal opens with correct amount
- ✅ Test card `4111 1111 1111 1111` completes payment
- ✅ Success message appears
- ✅ Cart clears after payment
- ✅ Order appears in Supabase `orders` table
- ✅ Order items appear in `order_items` table
- ✅ Admin can see order in dashboard
- ✅ Customer can see order in account page
- ✅ Donation flow works (no sign-in needed)
- ✅ Mobile checkout responsive and functional
- ✅ Failed payments don't create orders
- ✅ Error messages are user-friendly

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Payment system is working correctly
2. → Improve payment UI/UX (see `PAYMENT_UI_IDEAS.md`)
3. → Complete Razorpay KYC for Live Mode
4. → Deploy to production with Live Keys

---

## 📞 Getting Help

**If a test fails:**
1. Check the debugging section above
2. Read `RAZORPAY_SETUP.md` for setup details
3. Check browser console (F12) for error details
4. Check Razorpay dashboard for the payment attempt

**Razorpay Test Card Docs:**
https://razorpay.com/docs/payments/payments-gateway/test-card-details/

**Project Documentation:**
- `RAZORPAY_SETUP.md` — Setup guide
- `RAZORPAY_CHECKLIST.md` — Quick checklist
- `CLAUDE.md` — Overall project status
