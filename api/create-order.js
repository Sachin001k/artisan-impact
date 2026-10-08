import Razorpay from 'razorpay'
import { missingEnv, priceCart, getUserFromRequest, getAddressSnapshot } from './_pricing.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const missing = missingEnv()
  if (missing.length) {
    console.error('Missing env vars:', missing.join(', '))
    return res.status(500).json({ error: `Payments are not configured on the server (missing ${missing.join(', ')})` })
  }

  const { type, cart, receipt, address_id } = req.body || {}
  let amount // in paise (₹1 = 100 paise)
  const notes = { type: type === 'donation' ? 'donation' : 'order' }

  try {
    if (type === 'donation') {
      // Donations are a free-form amount chosen by the donor; no sign-in needed
      amount = Math.round(Number(req.body.amount))
    } else {
      // Purchases need a signed-in customer and one of their saved addresses,
      // checked BEFORE payment so nobody is charged for an order we can't ship
      const user = await getUserFromRequest(req)
      if (!user) return res.status(401).json({ error: 'Please sign in again to continue' })

      const address = await getAddressSnapshot(address_id, user.id)
      if (!address) return res.status(400).json({ error: 'Please choose a delivery address' })

      // Prices always come from the database, never from the browser
      const { totalInr } = await priceCart(cart)
      amount = totalInr * 100

      // Stored on the Razorpay order (server-side), read back in verify-payment
      notes.user_id = user.id
      notes.address_id = address_id
    }
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ error: 'Invalid amount' })
  }

  const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  try {
    const order = await instance.orders.create({
      amount,
      currency: 'INR',
      receipt: (receipt || `receipt_${Date.now()}`).slice(0, 40),
      notes,
    })
    res.status(200).json({ id: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.error?.description || err.message })
  }
}
