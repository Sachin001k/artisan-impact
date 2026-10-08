// "Checkout & pay" button in the cart drawer → goes to the /checkout page
import { getCart } from './cart.js'

export function initCheckoutButton() {
  const btn = document.getElementById('checkoutBtn')
  if (!btn) return
  btn.addEventListener('click', () => {
    if (getCart().length === 0) {
      alert('Your cart is empty — add something first!')
      return
    }
    window.location.href = '/checkout'
  })
}
