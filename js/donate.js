import { RAZORPAY_KEY_ID } from './config.js'

export function initDonate() {
  const form = document.getElementById('donateForm')
  if (!form) return
  form.addEventListener('submit', handleDonate)

  document.querySelectorAll('.donate-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('donateAmount').value = btn.dataset.amount
    })
  })
}

async function handleDonate(e) {
  e.preventDefault()
  const amount = Number(document.getElementById('donateAmount').value)
  const email = document.getElementById('donateEmail').value
  if (!amount || amount < 1 || !email) return

  let order
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amount * 100, receipt: `donation_${Date.now()}` }),
    })
    order = await res.json()
  } catch (err) {
    console.error(err)
  }

  if (!order || !order.id) {
    alert('Could not start donation. Make sure the API is running (see README) and try again.')
    return
  }

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    name: 'Artisan Impact',
    description: 'Donation',
    order_id: order.id,
    prefill: { email },
    theme: { color: '#E8A23B' },
    handler: async function (response) {
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount: amount * 100,
          customer_email: email,
          type: 'donation',
        }),
      })
      const result = await verifyRes.json()
      const toast = document.getElementById('toast')
      if (result.verified) {
        toast.textContent = 'Thank you for your donation!'
      } else {
        toast.textContent = 'Something went wrong verifying the donation.'
      }
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 4000)
    },
  }

  new Razorpay(options).open()
}
