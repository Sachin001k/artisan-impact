import { supabase } from './supabaseClient.js'
import { getCart, cartTotal, clearCart } from './cart.js'
import { RAZORPAY_KEY_ID } from './config.js'
import { onAuthChange, initAuthUI, openAuthModal } from './auth.js'
import { trackVisit } from './track.js'
import { escapeHtml, formatINR, fallbackGradient } from './utils.js'
import { listAddresses, addressHtml } from './addresses.js'
import { renderAddressForm } from './address-form.js'

trackVisit()
initAuthUI()

const $ = (id) => document.getElementById(id)
const emptyEl = $('checkoutEmpty')
const reviewEl = $('checkoutReview')
const successEl = $('checkoutSuccess')
const payBtn = $('payNowBtn')
const payHint = $('payHint')
const overlay = $('processingOverlay')

let currentUser = null
let addresses = []
let selectedAddressId = null
let step = 'delivery' // 'delivery' → 'pay'

// ===== ORDER SUMMARY =====
function renderOrderSummary() {
  const cart = getCart()
  if (cart.length === 0) {
    emptyEl.style.display = 'block'
    reviewEl.style.display = 'none'
    return
  }
  emptyEl.style.display = 'none'
  reviewEl.style.display = 'block'

  $('checkoutItems').innerHTML = cart
    .map(
      (item, i) => `
    <div class="summary-line">
      <div class="summary-thumb" style="background:${fallbackGradient(i)};">
        ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : ''}
      </div>
      <div class="summary-line-info">
        <div class="summary-line-title">${escapeHtml(item.title)}</div>
        <div class="summary-line-sub">${escapeHtml(item.artist)} · Qty ${item.quantity}</div>
      </div>
      <div class="summary-line-price">${formatINR(item.price_inr * item.quantity)}</div>
    </div>`
    )
    .join('')

  const total = formatINR(cartTotal())
  $('checkoutSubtotal').textContent = total
  $('checkoutTotal').textContent = total
}

// ===== STEPS =====
function setStep(next) {
  step = next
  const onPay = step === 'pay'
  $('deliveryStep').hidden = onPay
  $('deliverySummary').hidden = !onPay
  $('checkoutHeading').textContent = onPay ? 'Review & pay' : 'Where should we deliver?'
  $('stepDelivery').className = `checkout-step-pill ${onPay ? 'done' : 'active'}`
  $('stepDelivery').textContent = onPay ? '✓ Delivery' : '2. Delivery'
  $('stepPay').className = `checkout-step-pill${onPay ? ' active' : ''}`
  if (onPay) $('deliverySummaryAddress').innerHTML = addressHtml(selectedAddress())
  updatePayButton()
}

function selectedAddress() {
  return addresses.find((a) => a.id === selectedAddressId) || null
}

function updatePayButton() {
  payHint.textContent = ''
  if (!currentUser) {
    payBtn.textContent = 'Sign in to continue'
  } else if (step === 'delivery') {
    payBtn.textContent = 'Deliver here →'
    if (!selectedAddressId) payHint.textContent = 'Choose or add a delivery address to continue.'
  } else {
    payBtn.textContent = `Pay ${formatINR(cartTotal())}`
  }
  payBtn.disabled = Boolean(currentUser && step === 'delivery' && !selectedAddressId)
}

// ===== ADDRESSES =====
async function loadAddresses(selectId) {
  $('deliveryLoading').hidden = false
  try {
    addresses = await listAddresses()
  } catch (err) {
    console.error(err)
    addresses = []
    $('deliveryLoading').textContent = /addresses/.test(err.message)
      ? 'Addresses aren’t set up yet — run sql/delivery-and-performance.sql in Supabase.'
      : 'Couldn’t load your addresses. Please refresh the page.'
    return
  }
  $('deliveryLoading').hidden = true
  $('deliveryChooser').hidden = false

  if (selectId) selectedAddressId = selectId
  if (!addresses.some((a) => a.id === selectedAddressId)) {
    selectedAddressId = (addresses.find((a) => a.is_default) || addresses[0])?.id || null
  }
  renderAddressList()

  // No saved address yet → open the form straight away
  if (addresses.length === 0) openAddressForm()
  else closeAddressForm()
  updatePayButton()
}

function renderAddressList() {
  $('addressList').innerHTML = addresses
    .map(
      (a) => `
    <label class="address-option${a.id === selectedAddressId ? ' selected' : ''}">
      <input type="radio" name="address" value="${a.id}"${a.id === selectedAddressId ? ' checked' : ''}>
      <div class="address-block">
        ${addressHtml(a).replace('</strong>', `</strong>${a.is_default ? '<span class="address-tag">Default</span>' : ''}`)}
      </div>
      <button type="button" class="address-edit" data-edit="${a.id}">Edit</button>
    </label>`
    )
    .join('')
}

$('addressList').addEventListener('change', (e) => {
  if (e.target.name !== 'address') return
  selectedAddressId = e.target.value
  renderAddressList()
  updatePayButton()
})

$('addressList').addEventListener('click', (e) => {
  const id = e.target.closest('[data-edit]')?.dataset.edit
  if (!id) return
  e.preventDefault()
  openAddressForm(addresses.find((a) => a.id === id))
})

function openAddressForm(address = null) {
  const wrap = $('addressFormWrap')
  wrap.hidden = false
  $('addAddressBtn').hidden = true
  renderAddressForm(wrap, {
    address,
    defaults: {
      full_name: currentUser?.user_metadata?.full_name || '',
      phone: (currentUser?.user_metadata?.phone || '').replace(/\D/g, '').slice(-10),
    },
    submitLabel: address ? 'Save changes' : 'Save and deliver here',
    onSaved: (saved) => loadAddresses(saved.id),
    onCancel: addresses.length ? closeAddressForm : null,
  })
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function closeAddressForm() {
  $('addressFormWrap').hidden = true
  $('addressFormWrap').innerHTML = ''
  $('addAddressBtn').hidden = false
}

$('addAddressBtn').addEventListener('click', () => openAddressForm())
$('changeAddressBtn').addEventListener('click', () => setStep('delivery'))
$('deliverySigninBtn').addEventListener('click', () => openAuthModal('Sign in to choose your delivery address.'))

// ===== AUTH =====
onAuthChange((user) => {
  const changed = user?.id !== currentUser?.id
  currentUser = user
  $('deliverySignin').hidden = Boolean(user)
  if (!user) {
    $('deliveryChooser').hidden = true
    $('deliveryLoading').hidden = true
    addresses = []
    selectedAddressId = null
    setStep('delivery')
  } else if (changed) {
    loadAddresses()
  }
  updatePayButton()
})

// ===== PAYMENT =====
payBtn.addEventListener('click', () => {
  if (!currentUser) return openAuthModal('Sign in to complete your purchase.')
  if (step === 'delivery') {
    if (!selectedAddressId) return
    setStep('pay')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  handlePayNow()
})

async function handlePayNow() {
  const cart = getCart()
  const address = selectedAddress()
  if (cart.length === 0 || !address) return

  // Only ids + quantities matter — the server prices the cart from the database
  const cartItems = cart.map((item) => ({ id: item.id, quantity: item.quantity }))

  payBtn.disabled = true
  payBtn.textContent = 'Opening secure payment…'

  let order
  try {
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ type: 'order', cart: cartItems, address_id: address.id, receipt: `order_${Date.now()}` }),
    })
    order = await res.json().catch(() => null)
  } catch (err) {
    console.error(err)
  }

  payBtn.disabled = false
  updatePayButton()

  if (!order || !order.id) {
    alert(order?.error ? `Could not start checkout: ${order.error}` : 'Could not start checkout. Please try again in a moment.')
    return
  }

  if (order.amount !== cartTotal() * 100) {
    alert(`Some prices have changed — your total is now ${formatINR(order.amount / 100)}. Please review your cart and try again.`)
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
      email: currentUser.email,
      name: address.full_name,
      contact: `+91${address.phone}`,
    },
    theme: { color: '#C8432E' },
    modal: {
      ondismiss: () => overlay.classList.remove('open'),
    },
    handler: async function (response) {
      overlay.classList.add('open')

      let result = null
      try {
        const verifyRes = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            cart: cartItems,
            customer_email: currentUser.email,
          }),
        })
        result = await verifyRes.json().catch(() => null)
      } catch (err) {
        console.error(err)
      }

      overlay.classList.remove('open')

      if (result?.verified) {
        clearCart()
        showSuccess(response.razorpay_payment_id, address)
      } else {
        alert(
          `We couldn't confirm your payment (Payment ID: ${response.razorpay_payment_id}). ` +
            'If money was deducted, contact us with this ID and we will sort it out.'
        )
      }
    },
  }

  try {
    const rzp = new Razorpay(options)
    // Razorpay shows its own retry screen on failure, so just log it here
    rzp.on('payment.failed', (res) => {
      overlay.classList.remove('open')
      console.warn('Payment failed:', res.error?.description)
    })
    rzp.open()
  } catch (err) {
    console.error(err)
    alert('The payment window could not open. Please refresh the page and try again.')
  }
}

function showSuccess(paymentId, address) {
  reviewEl.style.display = 'none'
  successEl.style.display = 'block'
  $('successOrderId').textContent = `Payment ID: ${paymentId}`
  $('successAddress').innerHTML = addressHtml(address)
  $('stepPay').className = 'checkout-step-pill done'
  $('stepPay').textContent = '✓ Pay'
  $('stepDone').classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

renderOrderSummary()
updatePayButton()
