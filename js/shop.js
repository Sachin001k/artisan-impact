import { supabase } from './supabaseClient.js'
import { addToCart } from './cart.js'

let allProducts = []

export async function loadProducts() {
  const grid = document.getElementById('shopGrid')
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    grid.innerHTML = `<p>Couldn't load products right now. Check your Supabase URL/key in js/supabaseClient.js.</p>`
    console.error(error)
    return
  }

  allProducts = data
  renderProducts(allProducts)
}

function renderProducts(products) {
  const grid = document.getElementById('shopGrid')
  if (products.length === 0) {
    grid.innerHTML = `<p>No pieces here yet — check back soon.</p>`
    return
  }

  const palette = ['var(--poppy)', 'var(--cobalt)', 'var(--teal)', 'var(--marigold)', '#8a5cd6']

  grid.innerHTML = products
    .map((p, i) => {
      const bg = p.image_url
        ? `url(${p.image_url}) center/cover`
        : `linear-gradient(135deg, ${palette[i % palette.length]}, #e0694f)`
      return `
      <div class="polaroid" data-cat="${p.category}" data-price="${p.price_inr}">
        <div class="art-thumb" style="background:${bg};"></div>
        <h3>${p.title}</h3>
        <div class="p-meta"><span class="p-artist">by ${p.artist}</span><span class="p-price">₹${p.price_inr}</span></div>
        <button class="add-btn" data-id="${p.id}">Add to cart</button>
      </div>
    `
    })
    .join('')

  grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === btn.dataset.id)
      addToCart(product)
      btn.textContent = 'Added ✓'
      btn.classList.add('added')
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
