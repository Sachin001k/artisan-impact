import { supabase } from './supabaseClient.js'
import { getUser, signIn } from './auth.js'
import { escapeHtml, formatINR } from './utils.js'
import { addressHtml, addressLines } from './addresses.js'
import { IMAGE_SLOTS, fetchSiteImages } from './site-images.js'
import { uploadImage } from './upload.js'
import { initProductsSection, loadProductsSection } from './admin-products.js'

const sidebar = document.getElementById('dashboardSidebar')
const main = document.querySelector('.dashboard-main')
const loginScreen = document.getElementById('adminLoginScreen')

const SECTION_TITLES = { statistics: 'Statistics', orders: 'Orders', products: 'Products', images: 'Site Images' }
const loadedSections = new Set()
let allOrders = []

// ===== AUTH =====
async function initDashboard() {
  const user = await getUser()
  if (!user) return showLogin()

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    await supabase.auth.signOut()
    return showLogin(`Access denied — ${user.email} is not in the admin list.`)
  }

  document.getElementById('adminEmail').textContent = user.email
  loginScreen.style.display = 'none'
  sidebar.style.display = ''
  main.style.display = ''
  if (window.innerWidth < 768) sidebar.classList.add('closed')
  // /admin#products etc. opens that section directly
  const fromHash = location.hash.slice(1)
  navigateToSection(SECTION_TITLES[fromHash] ? fromHash : 'statistics')
}

function showLogin(message) {
  loginScreen.style.display = 'flex'
  sidebar.style.display = 'none'
  main.style.display = 'none'
  const errorEl = document.getElementById('adminLoginError')
  errorEl.textContent = message || ''
  errorEl.style.display = message ? 'block' : 'none'
}

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('adminLoginEmail').value
  const password = document.getElementById('adminLoginPassword').value

  const { error } = await signIn(email, password)
  if (error) {
    const hint = /invalid login/i.test(error.message)
      ? ' First time? Create an account with this email from the homepage (Sign in → Create one), then come back.'
      : ''
    return showLogin(error.message + hint)
  }
  await initDashboard()
})

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = '/'
})

// ===== NAVIGATION =====
function navigateToSection(section) {
  history.replaceState(null, '', section === 'statistics' ? '/admin' : `/admin#${section}`)
  document.querySelectorAll('.page-section').forEach((s) => s.classList.remove('active'))
  document.getElementById(section + 'Section')?.classList.add('active')

  document.querySelectorAll('.nav-item[data-section]').forEach((item) => {
    item.classList.toggle('active', item.dataset.section === section)
  })
  document.getElementById('pageTitle').textContent = SECTION_TITLES[section] || 'Dashboard'

  if (loadedSections.has(section)) return
  loadedSections.add(section)
  if (section === 'statistics') loadStatistics()
  else if (section === 'orders') loadOrders()
  else if (section === 'products') loadProductsSection()
  else if (section === 'images') loadImages()
}

document.querySelectorAll('.nav-item[data-section]').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    navigateToSection(item.dataset.section)
    if (window.innerWidth < 768) sidebar.classList.add('closed')
  })
})
document.getElementById('sidebarToggle')?.addEventListener('click', () => sidebar.classList.toggle('closed'))
document.getElementById('sidebarClose')?.addEventListener('click', () => sidebar.classList.add('closed'))

// ===== STATISTICS =====
async function loadStatistics() {
  const errorEl = document.getElementById('statsError')
  errorEl.hidden = true

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  document.getElementById('statsMonthLabel').textContent = `This month (${monthName}) vs. all time`

  const { data: stats, error } = await supabase.rpc('admin_stats')
  if (error) {
    console.error(error)
    errorEl.textContent = /admin_stats/.test(error.message)
      ? 'Statistics are not set up yet — run sql/stats-and-images.sql in the Supabase SQL Editor.'
      : `Could not load statistics: ${error.message}`
    errorEl.hidden = false
    return
  }

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN')
  const set = (id, value) => (document.getElementById(id).textContent = value)
  set('statVisitorsMonth', fmt(stats.visitors_month))
  set('statVisitorsAll', fmt(stats.visitors_all))
  set('statCartMonth', fmt(stats.cart_month))
  set('statCartAll', fmt(stats.cart_all))
  set('statBuyersMonth', fmt(stats.buyers_month))
  set('statBuyersAll', fmt(stats.buyers_all))
  set('statSoldMonth', `${fmt(stats.sold_month)} paintings sold`)
  set('statSoldAll', `${fmt(stats.sold_all)} paintings sold`)
}

document.getElementById('refreshStatsBtn').addEventListener('click', loadStatistics)

// ===== ORDERS =====
const DELIVERY_LABELS = { processing: 'To ship', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }

async function loadOrders() {
  const tbody = document.getElementById('ordersTableBody')
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_email, total_inr, status, created_at, shipping_address, fulfillment_status')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error(error)
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--poppy); text-align:center;">${
      /shipping_address|fulfillment_status/.test(error.message)
        ? 'Delivery columns missing — run sql/delivery-and-performance.sql in Supabase.'
        : 'Error loading orders'
    }</td></tr>`
    return
  }
  allOrders = data
  renderOrders()
}

function deliveryBadge(status) {
  const s = status || 'processing'
  return `<span class="status-badge delivery-${escapeHtml(s)}">${DELIVERY_LABELS[s] || escapeHtml(s)}</span>`
}

function renderOrders() {
  const search = document.getElementById('orderSearch').value.trim().toLowerCase()
  const status = document.getElementById('orderStatus').value
  const tbody = document.getElementById('ordersTableBody')
  const stats = document.getElementById('ordersStats')

  const filtered = allOrders.filter((o) => {
    if (status && (o.fulfillment_status || 'processing') !== status) return false
    if (!search) return true
    const ship = o.shipping_address || {}
    return [o.id, o.customer_email, ship.full_name, ship.phone, ship.city, ship.pincode]
      .some((v) => (v || '').toLowerCase().includes(search))
  })

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No orders here</td></tr>'
    stats.textContent = ''
    return
  }

  tbody.innerHTML = filtered
    .map((o) => {
      const ship = o.shipping_address
      return `
      <tr data-order-id="${o.id}">
        <td><span class="order-id">#${o.id.slice(0, 8)}</span></td>
        <td>${escapeHtml(o.customer_email || '—')}</td>
        <td>${ship ? `${escapeHtml(ship.city)} ${escapeHtml(ship.pincode)}` : '<span class="text-warn">No address</span>'}</td>
        <td>${formatINR(o.total_inr)}</td>
        <td>${deliveryBadge(o.fulfillment_status)}</td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
        <td><button class="table-action-btn">View</button></td>
      </tr>`
    })
    .join('')

  const revenue = filtered.reduce((sum, o) => sum + (o.total_inr || 0), 0)
  stats.textContent = `Showing ${filtered.length} orders • ${formatINR(revenue)}`
}

document.getElementById('orderSearch').addEventListener('input', renderOrders)
document.getElementById('orderStatus').addEventListener('change', renderOrders)
document.getElementById('ordersTableBody').addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-order-id]')
  if (row) openOrderModal(row.dataset.orderId)
})

async function openOrderModal(orderId) {
  const order = allOrders.find((o) => o.id === orderId)
  if (!order) return

  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, products(title, price_inr)')
    .eq('order_id', orderId)

  const row = (label, value) => `
    <div class="order-detail-row">
      <span class="order-detail-label">${label}</span>
      <span class="order-detail-value">${value}</span>
    </div>`

  const ship = order.shipping_address
  const mapLink = ship?.lat != null
    ? `https://www.google.com/maps?q=${ship.lat},${ship.lng}`
    : ship ? `https://www.google.com/maps/search/${encodeURIComponent(addressLines(ship).join(', '))}` : null
  const current = order.fulfillment_status || 'processing'

  document.getElementById('orderModalBody').innerHTML = `
    ${row('Order ID', `#${order.id.slice(0, 8)}`)}
    ${row('Customer', escapeHtml(order.customer_email || '—'))}
    ${row('Total', formatINR(order.total_inr))}
    ${row('Date', new Date(order.created_at).toLocaleString('en-IN'))}

    <h4 class="modal-subhead">Ship to</h4>
    <div class="ship-box">
      ${
        ship
          ? `${addressHtml(ship)}
             <div class="ship-links">
               <a href="tel:+91${escapeHtml(ship.phone)}">📞 Call</a>
               <a href="${mapLink}" target="_blank" rel="noopener">📍 Open in Google Maps</a>
               <button type="button" id="copyAddressBtn">📋 Copy address</button>
             </div>`
          : '<span class="text-warn">No address was saved with this order (placed before delivery addresses existed). Contact the customer.</span>'
      }
    </div>

    <h4 class="modal-subhead">Delivery status</h4>
    <div class="delivery-update">
      <select id="deliveryStatusSelect" class="filter-select">
        ${Object.entries(DELIVERY_LABELS)
          .map(([value, label]) => `<option value="${value}"${value === current ? ' selected' : ''}>${label === 'To ship' ? 'Preparing (to ship)' : label}</option>`)
          .join('')}
      </select>
      <button type="button" class="btn btn-dark" id="saveDeliveryBtn">Update</button>
      <span id="deliverySaveNote" class="text-muted"></span>
    </div>

    <h4 class="modal-subhead">Items</h4>
    ${
      items?.length
        ? items
            .map((i) => `<div class="order-item-line"><strong>${escapeHtml(i.products?.title || 'Item')}</strong> × ${i.quantity} <span>${formatINR(i.products?.price_inr ?? 0)} each</span></div>`)
            .join('')
        : '<p>No items</p>'
    }
  `

  document.getElementById('copyAddressBtn')?.addEventListener('click', async (e) => {
    const text = [ship.full_name, ...addressLines(ship), `Phone: ${ship.phone}`].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      e.target.textContent = '✓ Copied'
    } catch {
      prompt('Copy this address:', text)
    }
  })

  document.getElementById('saveDeliveryBtn').addEventListener('click', async () => {
    const value = document.getElementById('deliveryStatusSelect').value
    const note = document.getElementById('deliverySaveNote')
    note.textContent = 'Saving…'
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ fulfillment_status: value, fulfillment_updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select('id')
    if (error || !updated?.length) {
      note.textContent = error ? `Failed: ${error.message}` : 'Not allowed — run sql/delivery-and-performance.sql'
      return
    }
    order.fulfillment_status = value
    note.textContent = '✓ Saved'
    renderOrders()
  })

  document.getElementById('orderModal').classList.add('open')
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open')
}
document.getElementById('orderModalClose').addEventListener('click', closeOrderModal)
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') closeOrderModal()
})

// ===== SITE IMAGES =====
function slotCard({ id, title, subtitle, imageUrl, canReset }) {
  return `
    <div class="image-slot" data-slot-id="${escapeHtml(id)}">
      <div class="image-slot-preview">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : '<span>No image yet</span>'}
      </div>
      <div class="image-slot-info">
        <div class="image-slot-title">${escapeHtml(title)}</div>
        <div class="image-slot-sub">${escapeHtml(subtitle)}</div>
      </div>
      <div class="image-slot-actions">
        <label class="btn btn-dark image-upload-btn">
          Upload new
          <input type="file" accept="image/*" hidden>
        </label>
        ${canReset ? '<button type="button" class="btn btn-outline image-reset-btn">Use default</button>' : ''}
      </div>
      <div class="image-slot-status"></div>
    </div>`
}

async function loadImages() {
  const errorEl = document.getElementById('imagesError')
  errorEl.hidden = true

  const siteImages = await fetchSiteImages()

  // Homepage defaults, read from the real homepage so they never drift
  const defaults = await fetch('/')
    .then((r) => r.text())
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return Object.fromEntries(
        [...doc.querySelectorAll('img[data-image-slot]')].map((img) => [img.dataset.imageSlot, img.getAttribute('src')])
      )
    })
    .catch(() => ({}))

  document.getElementById('siteImageSlots').innerHTML = IMAGE_SLOTS.map((slot) =>
    slotCard({
      id: `site:${slot.key}`,
      title: slot.section,
      subtitle: siteImages[slot.key] ? `${slot.label} · custom image` : `${slot.label} · default`,
      imageUrl: siteImages[slot.key] || defaults[slot.key],
      canReset: Boolean(siteImages[slot.key]),
    })
  ).join('')
}

async function saveSlotImage(slotId, imageUrl) {
  const key = slotId.replace(/^site:/, '')
  if (imageUrl) {
    return supabase.from('site_images').upsert({ slot: key, image_url: imageUrl, updated_at: new Date().toISOString() })
  }
  return supabase.from('site_images').delete().eq('slot', key)
}

const imagesSection = document.getElementById('imagesSection')

imagesSection.addEventListener('change', async (e) => {
  const input = e.target.closest('.image-slot input[type="file"]')
  if (!input?.files?.[0]) return
  const card = input.closest('.image-slot')
  const status = card.querySelector('.image-slot-status')
  const slotId = card.dataset.slotId

  status.textContent = 'Uploading…'
  status.className = 'image-slot-status'
  try {
    const url = await uploadImage(input.files[0], 'site')
    const { error } = await saveSlotImage(slotId, url)
    if (error) throw error
    loadImages()
  } catch (err) {
    console.error(err)
    status.textContent = /bucket|row-level|policy/i.test(err.message) || err.code === 'PGRST116'
      ? 'Upload blocked — run sql/stats-and-images.sql in Supabase first.'
      : `Upload failed: ${err.message}`
    status.className = 'image-slot-status error'
  } finally {
    input.value = ''
  }
})

imagesSection.addEventListener('click', async (e) => {
  const btn = e.target.closest('.image-reset-btn')
  if (!btn) return
  const card = btn.closest('.image-slot')
  if (!confirm('Go back to the original built-in image for this section?')) return
  const { error } = await saveSlotImage(card.dataset.slotId, null)
  if (error) {
    card.querySelector('.image-slot-status').textContent = `Could not reset: ${error.message}`
    return
  }
  loadImages()
})

// ===== START =====
initProductsSection()
initDashboard()
