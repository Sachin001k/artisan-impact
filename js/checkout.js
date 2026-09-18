import { getCart } from './cart.js'

export function initCheckout() {
  const btn = document.getElementById('checkoutBtn')
  if (!btn) return
  btn.addEventListener('click', () => {
    if (getCart().length === 0) return
    window.location.href = 'checkout.html'
  })
}
