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
      body: JSON.stringify({ type: 'donation', amount: amount * 100, receipt: `donation_${Date.now()}` }),
    })
    order = await res.json().catch(() => null)
  } catch (err) {
    console.error(err)
  }

  if (!order || !order.id) {
    alert(order?.error ? `Could not start donation: ${order.error}` : 'Could not start donation. Please try again in a moment.')
    return
  }

  if (typeof Razorpay === 'undefined') {
    alert(
      'The payment window could not load. This is usually caused by an ad blocker or privacy extension ' +
      '(uBlock, Brave Shields, etc.) blocking checkout.razorpay.com — please disable it for this site and try again.'
    )
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
      let result = null
      try {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            customer_email: email,
            type: 'donation',
          }),
        })
        result = await verifyRes.json().catch(() => null)
      } catch (err) {
        console.error(err)
      }
      const toast = document.getElementById('toast')
      if (result?.verified) {
        toast.textContent = 'Thank you for your donation!'
        e.target.reset()
      } else {
        toast.textContent = 'Something went wrong verifying the donation.'
      }
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 4000)
    },
  }

  try {
    const rzp = new Razorpay(options)
    // Razorpay shows its own retry screen on failure, so just log it here
    rzp.on('payment.failed', (res) => {
      console.warn('Payment failed:', res.error?.description)
    })
    rzp.open()
  } catch (err) {
    console.error(err)
    alert('The payment window could not open. Please refresh the page and try again.')
  }
}
