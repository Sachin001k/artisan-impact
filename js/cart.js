const CART_KEY = 'ai_cart'

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  renderCartBadge()
}

export function addToCart(product) {
  const cart = getCart()
  const existing = cart.find((item) => item.id === product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    cart.push({ ...product, quantity: 1 })
  }
  saveCart(cart)
}

export function removeFromCart(id) {
  const cart = getCart().filter((item) => item.id !== id)
  saveCart(cart)
  renderCartDrawer()
}

export function updateQuantity(id, qty) {
  const cart = getCart()
  const item = cart.find((i) => i.id === id)
  if (!item) return
  item.quantity = Math.max(1, qty)
  saveCart(cart)
  renderCartDrawer()
}

export function clearCart() {
  localStorage.removeItem(CART_KEY)
  renderCartBadge()
}

export function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price_inr * item.quantity, 0)
}

export function renderCartBadge() {
  const badge = document.getElementById('cartCount')
  if (!badge) return
  const count = getCart().reduce((sum, i) => sum + i.quantity, 0)
  badge.textContent = count
  badge.style.display = count > 0 ? 'flex' : 'none'
}

export function renderCartDrawer() {
  const list = document.getElementById('cartItems')
  const totalEl = document.getElementById('cartTotal')
  if (!list) return
  const cart = getCart()

  if (cart.length === 0) {
    list.innerHTML = '<p class="cart-empty">Your cart is empty.</p>'
  } else {
    list.innerHTML = cart
      .map(
        (item) => `
      <div class="cart-item">
        <div>
          <h4>${item.title}</h4>
          <span>${item.artist}</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-action="dec" data-id="${item.id}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
          <span class="cart-item-price">₹${item.price_inr * item.quantity}</span>
          <button class="remove-btn" data-id="${item.id}" title="Remove">×</button>
        </div>
      </div>
    `
      )
      .join('')
  }
  totalEl.textContent = `₹${cartTotal()}`

  list.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const item = getCart().find((i) => i.id === id)
      if (!item) return
      const delta = btn.dataset.action === 'inc' ? 1 : -1
      if (item.quantity + delta <= 0) removeFromCart(id)
      else updateQuantity(id, item.quantity + delta)
    })
  })
  list.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id))
  })
}
