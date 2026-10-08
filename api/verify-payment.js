import crypto from 'crypto'
import Razorpay from 'razorpay'
import { missingEnv, getSupabaseAdmin, priceCart, getAddressSnapshot } from './_pricing.js'

function signatureIsValid(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const missing = missingEnv()
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    return res.status(500).json({ error: `Payments are not configured on the server (missing ${missing.join(', ')})` })
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, customer_email } = req.body || {}

  // Verify the payment actually came from Razorpay and wasn't tampered with
  if (!signatureIsValid(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ verified: false, error: 'Invalid signature' })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  try {
    // Ask Razorpay what was actually paid, and read back the notes we attached
    // when creating the order (type, customer, address) — none of that is
    // taken from the browser.
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id)
    const paidAmountInr = razorpayOrder.amount_paid / 100
    const notes = razorpayOrder.notes || {}

    if (notes.type === 'donation') {
      const { error } = await supabaseAdmin.from('donations').insert({
        donor_email: customer_email,
        amount_inr: paidAmountInr,
        razorpay_payment_id,
      })
      // 23505 = already recorded (retried callback) — still a success
      if (error && error.code !== '23505') throw error
      return res.status(200).json({ verified: true })
    }

    // Purchase — idempotency: a retried callback must not create a second order
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()
    if (existingOrder) {
      return res.status(200).json({ verified: true, order_id: existingOrder.id })
    }

    // Re-price the cart from the database and make sure it matches what was
    // actually paid (protects against a tampered cart or client-side prices)
    const { items: pricedItems, totalInr: cartTotal } = await priceCart(cart)
    if (cartTotal !== paidAmountInr) {
      console.error(`Cart total (₹${cartTotal}) does not match amount paid (₹${paidAmountInr}) for order ${razorpay_order_id}`)
      return res.status(400).json({ verified: false, error: 'Order amount mismatch' })
    }

    const userId = notes.user_id || null
    const { data: userData } = userId ? await supabaseAdmin.auth.admin.getUserById(userId) : { data: null }

    // The money is already taken at this point, so a missing address must
    // never block recording the order — log it and let the admin follow up.
    let shippingAddress = null
    try {
      shippingAddress = await getAddressSnapshot(notes.address_id, userId)
    } catch (err) {
      console.error('Could not load shipping address', err)
    }
    if (!shippingAddress) console.error(`Order ${razorpay_order_id} has no shipping address`)

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        razorpay_order_id,
        customer_email: userData?.user?.email || customer_email,
        user_id: userId,
        total_inr: paidAmountInr,
        status: 'paid',
        shipping_address: shippingAddress,
      })
      .select()
      .single()

    if (orderError?.code === '23505') {
      // Another retry recorded it a moment ago
      return res.status(200).json({ verified: true })
    }
    if (orderError) throw orderError

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      pricedItems.map((item) => ({ order_id: order.id, product_id: item.id, quantity: item.quantity }))
    )
    if (itemsError) throw itemsError

    res.status(200).json({ verified: true, order_id: order.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ verified: false, error: err.message })
  }
}
