import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Service role key bypasses RLS - only ever used server-side, never in the browser
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    if (type === 'donation') {
      const { error } = await supabaseAdmin.from('donations').insert({
        donor_email: customer_email,
        amount_inr: amount / 100,
        razorpay_payment_id,
      })
      if (error) throw error
      return res.status(200).json({ verified: true })
    }

    // Purchase flow
    const total = cart.reduce((sum, item) => sum + item.price_inr * item.quantity, 0)

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        razorpay_order_id,
        customer_email,
        user_id: user_id || null,
        total_inr: total,
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
