import { supabase } from './supabaseClient.js'
import { addToCart, openCartDrawer, syncCartWithProducts } from './cart.js'
import { escapeHtml, formatINR, fallbackGradient, showToast } from './utils.js'

let allProducts = []

export async function loadProducts() {
  const grid = document.getElementById('shopGrid')
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    grid.innerHTML = `<p class="shop-message">Couldn't load the collection right now — please refresh in a moment.</p>`
    console.error(error)
    return
  }

  allProducts = data.filter((p) => p.is_active !== false)
  syncCartWithProducts(allProducts)
  renderProducts(allProducts)
}

function renderProducts(products) {
  const grid = document.getElementById('shopGrid')
  if (products.length === 0) {
    grid.innerHTML = `<p class="shop-message">No pieces here yet — check back soon.</p>`
    return
  }

  grid.innerHTML = products
    .map((p, i) => {
      const title = escapeHtml(p.title)
      const artist = escapeHtml(p.artist)
      const artistLabel = p.artist_id
        ? `<a href="/artist?id=${p.artist_id}" class="p-artist">by ${artist}</a>`
        : `<span class="p-artist">by ${artist}</span>`
      const thumb = p.image_url
        ? `<img src="${escapeHtml(p.image_url)}" alt="${title}" loading="lazy">`
        : ''
      return `
      <article class="polaroid" data-cat="${escapeHtml(p.category)}">
        <div class="art-thumb" style="background:${fallbackGradient(i)};">
          ${thumb}
          <span class="p-badge">${escapeHtml(p.category)}</span>
        </div>
        <h3>${title}</h3>
        <div class="p-meta">${artistLabel}<span class="p-price">${formatINR(p.price_inr)}</span></div>
        <button class="add-btn" data-id="${p.id}">Add to cart</button>
      </article>
    `
    })
    .join('')

  // A broken image link falls back to the colour block instead of a broken icon
  grid.querySelectorAll('.art-thumb img').forEach((img) => {
    img.addEventListener('error', () => img.remove(), { once: true })
  })

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === btn.dataset.id)
      addToCart(product)
      btn.textContent = 'Added ✓'
      btn.classList.add('added')
      showToast(`Added “${product.title}” to your cart`, { label: 'View cart', onClick: openCartDrawer })
      setTimeout(() => {
        btn.textContent = 'Add to cart'
        btn.classList.remove('added')
      }, 1500)
    })
  })
}

export function filterProducts(filter) {
  let filtered = allProducts
  if (filter === 'under1000') filtered = allProducts.filter((p) => p.price_inr < 1000)
  else if (filter !== 'all') filtered = allProducts.filter((p) => p.category === filter)
  renderProducts(filtered)
}
