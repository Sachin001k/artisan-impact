import { getCart } from './cart.js'

export function initCheckout() {
  const btn = document.getElementById('checkoutBtn')
  if (!btn) return
  btn.addEventListener('click', () => {
    if (getCart().length === 0) {
      alert('Your cart is empty — add something first!')
      return
    }
    window.location.href = 'checkout.html'
  })
}
