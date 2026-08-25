import { supabase } from './supabaseClient.js'
import { getUser } from './auth.js'

let currentEditId = null
let artists = []

const modal = document.getElementById('productModal')
const form = document.getElementById('productForm')
const addBtn = document.getElementById('addProductBtn')
const cancelBtn = document.getElementById('cancelBtn')
const logoutBtn = document.getElementById('logoutBtn')

async function checkAdmin() {
  const user = await getUser()
  if (!user) {
    window.location.href = 'index.html'
    return
  }
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    alert('Access denied.')
    window.location.href = 'index.html'
    return
  }
  document.getElementById('adminUser').textContent = user.email
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
  })
}

async function loadArtists() {
  const { data } = await supabase.from('artists').select('*').order('name')
  artists = data || []
  const select = document.getElementById('productArtist')
  select.innerHTML = '<option value="">— Select an artist —</option>'
  artists.forEach((a) => {
    const opt = document.createElement('option')
    opt.value = a.id
    opt.textContent = a.name
    select.appendChild(opt)
  })
}

async function loadProducts() {
  const container = document.getElementById('productsTable')
  const { data: products, error } = await supabase
    .from('products')
    .select('*, artists(name)')
    .order('created_at', { ascending: false })

  if (error) {
    container.innerHTML = `<p class="no-products">Error loading products.</p>`
    console.error(error)
    return
  }

  if (!products || products.length === 0) {
    container.innerHTML = `<p class="no-products">No products yet. Click "Add product" to create one.</p>`
    return
  }

  container.innerHTML = `
    <table class="products-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Artist</th>
          <th>Price</th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .map(
            (p) => `
          <tr>
            <td>${p.title}</td>
            <td>${p.artists?.name || '—'}</td>
            <td>₹${p.price_inr}</td>
            <td><span style="text-transform:capitalize;">${p.category}</span></td>
            <td>
              <div class="product-actions">
                <button class="btn-small btn-edit" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `
}

window.editProduct = async (id) => {
  const { data: product, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) {
    alert('Error loading product.')
    return
  }
  currentEditId = id
  document.getElementById('modalTitle').textContent = 'Edit product'
  document.getElementById('productTitle').value = product.title
  document.getElementById('productArtist').value = product.artist_id || ''
  document.getElementById('productPrice').value = product.price_inr
  document.getElementById('productCategory').value = product.category
  document.getElementById('productImage').value = product.image_url || ''
  modal.classList.add('open')
}

window.deleteProduct = async (id) => {
  if (!confirm('Are you sure? This cannot be undone.')) return
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    alert('Error deleting product.')
    return
  }
  loadProducts()
}

addBtn.addEventListener('click', () => {
  currentEditId = null
  document.getElementById('modalTitle').textContent = 'Add product'
  form.reset()
  modal.classList.add('open')
})

cancelBtn.addEventListener('click', () => {
  modal.classList.remove('open')
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const title = document.getElementById('productTitle').value
  const artistId = document.getElementById('productArtist').value
  const price = Number(document.getElementById('productPrice').value)
  const category = document.getElementById('productCategory').value
  const imageUrl = document.getElementById('productImage').value || null

  let error
  if (currentEditId) {
    ;({ error } = await supabase
      .from('products')
      .update({ title, artist_id: artistId, price_inr: price, category, image_url: imageUrl })
      .eq('id', currentEditId))
  } else {
    // For adding, we still need the old `artist` text field for backwards compat
    const artistName = artists.find((a) => a.id === artistId)?.name || 'Unknown'
    ;({ error } = await supabase.from('products').insert({
      title,
      artist: artistName,
      artist_id: artistId,
      price_inr: price,
      category,
      image_url: imageUrl,
    }))
  }

  if (error) {
    alert('Error saving product: ' + error.message)
    return
  }
  modal.classList.remove('open')
  loadProducts()
})

modal.querySelector('.modal-overlay') === modal
  ? null
  : modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open')
    })

;(async () => {
  await checkAdmin()
  await loadArtists()
  await loadProducts()
})()
