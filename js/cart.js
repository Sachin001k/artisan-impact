import { supabase } from './supabaseClient.js'
import { getVisitorId } from './track.js'
import { escapeHtml, formatINR, fallbackGradient } from './utils.js'

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
  supabase
    .from('cart_events')
    .insert({ product_id: product.id, visitor_id: getVisitorId() })
    .then(({ error }) => error && console.error(error))
}

// Drop items that no longer exist and refresh title/price/photo from the live catalogue
export function syncCartWithProducts(products) {
  const byId = new Map(products.map((p) => [p.id, p]))
  const cart = getCart()
  const synced = cart
    .filter((item) => byId.has(item.id))
    .map((item) => {
      const p = byId.get(item.id)
      return { ...item, title: p.title, artist: p.artist, price_inr: p.price_inr, image_url: p.image_url }
    })
  if (JSON.stringify(synced) !== JSON.stringify(cart)) saveCart(synced)
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

export function openCartDrawer() {
  document.getElementById('cartDrawer')?.classList.add('open')
  renderCartDrawer()
}

export function closeCartDrawer() {
  document.getElementById('cartDrawer')?.classList.remove('open')
}

export function renderCartDrawer() {
  const list = document.getElementById('cartItems')
  const totalEl = document.getElementById('cartTotal')
  const countEl = document.getElementById('cartHeaderCount')
  const footer = document.querySelector('.cart-footer')
  if (!list) return
  const cart = getCart()
  const count = cart.reduce((sum, i) => sum + i.quantity, 0)
  if (countEl) countEl.textContent = count ? `(${count})` : ''
  if (footer) footer.style.display = cart.length ? '' : 'none'

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon" aria-hidden="true">🎨</div>
        <p>Your cart is empty.</p>
        <a href="/#shop" class="btn btn-dark" id="cartBrowseBtn">Browse the collection</a>
      </div>`
    document.getElementById('cartBrowseBtn').addEventListener('click', closeCartDrawer)
    return
  }

  list.innerHTML = cart
    .map(
      (item, i) => `
    <div class="cart-item">
      <div class="cart-thumb" style="background:${fallbackGradient(i)};">
        ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="" loading="lazy">` : ''}
      </div>
      <div class="cart-item-body">
        <div class="cart-item-top">
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <span>${escapeHtml(item.artist)}</span>
          </div>
          <button class="remove-btn" data-id="${item.id}" title="Remove" aria-label="Remove ${escapeHtml(item.title)}">×</button>
        </div>
        <div class="cart-item-bottom">
          <div class="qty-control">
            <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-item-price">${formatINR(item.price_inr * item.quantity)}</span>
        </div>
      </div>
    </div>
  `
    )
    .join('')
  totalEl.textContent = formatINR(cartTotal())
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
