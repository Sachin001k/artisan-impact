import { getCart, cartTotal, clearCart, renderCartDrawer } from './cart.js'
import { RAZORPAY_KEY_ID } from './config.js'
import { getUser, openAuthModal } from './auth.js'

export function initCheckout() {
  document.getElementById('checkoutBtn').addEventListener('click', handleCheckout)
}

async function handleCheckout() {
  const cart = getCart()
  if (cart.length === 0) return

  const user = await getUser()
  if (!user) {
    openAuthModal('Sign in to complete your purchase — then hit "Checkout & pay" again.')
    return
  }
  const email = user.email

  const amountPaise = cartTotal() * 100

  let order
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountPaise, receipt: `order_${Date.now()}` }),
    })
    order = await res.json()
  } catch (err) {
    console.error(err)
  }

  if (!order || !order.id) {
    alert('Could not start checkout. Make sure the API is running (see README) and try again.')
    return
  }

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    name: 'Artisan Impact',
    description: 'Artwork purchase',
    order_id: order.id,
    prefill: { email, name: user.user_metadata?.full_name || '', contact: user.user_metadata?.phone || '' },
    theme: { color: '#C8432E' },
    handler: async function (response) {
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          cart,
          customer_email: email,
          user_id: user.id,
          type: 'order',
        }),
      })
      const result = await verifyRes.json()
      if (result.verified) {
        clearCart()
        renderCartDrawer()
        document.getElementById('cartDrawer').classList.remove('open')
        showToast('Order confirmed — thank you for supporting an artist!')
      } else {
        alert('Payment verification failed. If money was deducted, contact us and we will sort it out.')
      }
    },
  }

  const rzp = new Razorpay(options)
  rzp.open()
}

function showToast(message) {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 4000)
}
