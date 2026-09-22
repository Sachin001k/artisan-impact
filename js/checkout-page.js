import { getCart, cartTotal, clearCart } from './cart.js'
import { RAZORPAY_KEY_ID } from './config.js'
import { getUser, onAuthChange, initAuthUI, openAuthModal } from './auth.js'

const emptyEl = document.getElementById('checkoutEmpty')
const reviewEl = document.getElementById('checkoutReview')
const successEl = document.getElementById('checkoutSuccess')
const signinNote = document.getElementById('checkoutSigninNote')
const payBtn = document.getElementById('payNowBtn')
const overlay = document.getElementById('processingOverlay')

initAuthUI()

let currentUser = null

onAuthChange((user) => {
  currentUser = user
  signinNote.style.display = user ? 'none' : 'block'
})

function renderOrderSummary() {
  const cart = getCart()

  if (cart.length === 0) {
    emptyEl.style.display = 'block'
    reviewEl.style.display = 'none'
    return
  }

  emptyEl.style.display = 'none'
  reviewEl.style.display = 'block'

  const itemsEl = document.getElementById('checkoutItems')
  itemsEl.innerHTML = cart
    .map(
      (item) => `
    <div class="summary-line">
      <div>
        <div class="summary-line-title">${item.title}</div>
        <div class="summary-line-sub">${item.artist} · Qty ${item.quantity}</div>
      </div>
      <div class="summary-line-price">₹${item.price_inr * item.quantity}</div>
    </div>
  `
    )
    .join('')

  const total = cartTotal()
  document.getElementById('checkoutTotal').textContent = `₹${total}`
  document.getElementById('checkoutPayAmount').textContent = `₹${total}`
}

async function handlePayNow() {
  const cart = getCart()
  if (cart.length === 0) return

  if (!currentUser) {
    openAuthModal('Sign in to complete your purchase — then hit "Pay now" again.')
    return
  }

  const email = currentUser.email
  const amountPaise = cartTotal() * 100

  payBtn.disabled = true

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

  payBtn.disabled = false

  if (!order || !order.id) {
    alert('Could not start checkout. Please try again in a moment.')
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
    description: 'Artwork purchase',
    order_id: order.id,
    prefill: {
      email,
      name: currentUser.user_metadata?.full_name || '',
      contact: currentUser.user_metadata?.phone || '',
    },
    theme: { color: '#C8432E' },
    modal: {
      ondismiss: () => {
        overlay.classList.remove('open')
      },
    },
    handler: async function (response) {
      overlay.classList.add('open')

      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          cart,
          customer_email: email,
          user_id: currentUser.id,
          type: 'order',
        }),
      })
      const result = await verifyRes.json()

      overlay.classList.remove('open')

      if (result.verified) {
        clearCart()
        showSuccess(response.razorpay_payment_id)
      } else {
        alert('Payment verification failed. If money was deducted, contact us and we will sort it out.')
      }
    },
  }

  try {
    const rzp = new Razorpay(options)
    rzp.open()
  } catch (err) {
    console.error(err)
    alert('The payment window could not open. Please refresh the page and try again.')
  }
}

function showSuccess(paymentId) {
  reviewEl.style.display = 'none'
  successEl.style.display = 'block'
  document.getElementById('successOrderId').textContent = `Payment ID: ${paymentId}`
  document.getElementById('stepReview').classList.remove('active')
  document.getElementById('stepReview').classList.add('done')
  document.getElementById('stepDone').classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

payBtn.addEventListener('click', handlePayNow)

renderOrderSummary()
