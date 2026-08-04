import Razorpay from 'razorpay'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { amount, receipt } = req.body // amount in paise (₹1 = 100 paise)

  if (!amount || amount < 100) {
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
      receipt: receipt || `receipt_${Date.now()}`,
    })
    res.status(200).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
