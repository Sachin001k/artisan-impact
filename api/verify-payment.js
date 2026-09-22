import crypto from 'crypto'
import Razorpay from 'razorpay'
import { createClient } from '@supabase/supabase-js'

// Service role key bypasses RLS - only ever used server-side, never in the browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    cart,
    amount,
    customer_email,
    user_id,
    type, // 'order' | 'donation'
  } = req.body

  // Verify the payment actually came from Razorpay and wasn't tampered with
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Invalid signature' })
  }

  try {
    // Ask Razorpay directly what was actually paid for this order — never
    // trust a client-submitted amount/cart on its own, since the browser
    // could be tampered with between order creation and this callback.
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id)
    const paidAmountInr = razorpayOrder.amount_paid / 100

    if (type === 'donation') {
      const { data: existing } = await supabaseAdmin
        .from('donations')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .maybeSingle()
      if (existing) return res.status(200).json({ verified: true })

      const { error } = await supabaseAdmin.from('donations').insert({
        donor_email: customer_email,
        amount_inr: paidAmountInr,
        razorpay_payment_id,
      })
      if (error) throw error
      return res.status(200).json({ verified: true })
    }

    // Purchase flow — idempotency: a retried/duplicated callback for the
    // same Razorpay order should never create a second order row.
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()
    if (existingOrder) {
      return res.status(200).json({ verified: true, order_id: existingOrder.id })
    }

    // The submitted cart must add up to what was actually paid — otherwise
    // reject rather than record a mismatched order (protects against a
    // tampered cart being submitted after paying for a different amount).
    const cartTotal = cart.reduce((sum, item) => sum + item.price_inr * item.quantity, 0)
    if (cartTotal !== paidAmountInr) {
      console.error(`Cart total (₹${cartTotal}) does not match amount paid (₹${paidAmountInr}) for order ${razorpay_order_id}`)
      return res.status(400).json({ verified: false, error: 'Order amount mismatch' })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        razorpay_order_id,
        customer_email,
        user_id: user_id || null,
        total_inr: paidAmountInr,
        status: 'paid',
      })
      .select()
      .single()

    if (orderError) throw orderError

    const items = cart.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(items)
    if (itemsError) throw itemsError

    res.status(200).json({ verified: true, order_id: order.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ verified: false, error: err.message })
  }
}
