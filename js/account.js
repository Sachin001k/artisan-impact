import { supabase } from './supabaseClient.js'
import { initDropdownMenu } from './nav.js'
import { onAuthChange, initAuthUI, openAuthModal, getInitials } from './auth.js'
import { trackVisit } from './track.js'
import { escapeHtml, formatINR } from './utils.js'
import { listAddresses, deleteAddress, setDefaultAddress, addressHtml, addressLines } from './addresses.js'
import { renderAddressForm } from './address-form.js'

trackVisit()
initAuthUI()
initDropdownMenu()

const $ = (id) => document.getElementById(id)
const signedOutShell = $('accountSignedOut')
const dashboardShell = $('accountDashboard')

const DELIVERY_LABELS = {
  processing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

let currentUser = null
let addresses = []

$('accountSignInBtn').addEventListener('click', () => openAuthModal('Sign in to see your orders.'))

// Fires once on page load (with the saved session) and again on sign in / out
onAuthChange((user) => {
  if (user?.id === currentUser?.id) return
  currentUser = user
  if (user) {
    showDashboard(user)
  } else {
    signedOutShell.style.display = 'block'
    dashboardShell.style.display = 'none'
  }
})

async function showDashboard(user) {
  signedOutShell.style.display = 'none'
  dashboardShell.style.display = 'block'
  $('accountName').textContent = user.user_metadata?.full_name || user.email
  $('accountAvatar').textContent = getInitials(user)

  // Admins can shop too — show their orders, plus a shortcut to the dashboard
  supabase.rpc('is_admin').then(({ data: isAdmin }) => {
    if (isAdmin && !$('adminShortcut')) {
      $('accountName').insertAdjacentHTML(
        'afterend',
        '<a id="adminShortcut" href="/admin" class="btn btn-dark" style="margin-top:10px; padding:8px 16px; font-size:0.82rem;">Go to admin dashboard →</a>'
      )
    }
  })

  await Promise.all([loadOrders(user), loadAddresses()])
}

// ===== ORDERS =====
async function loadOrders(user) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_inr, status, created_at, shipping_address, fulfillment_status, order_items(quantity, products(title))')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  const totalItems = orders.reduce((sum, o) => sum + o.order_items.reduce((s, i) => s + i.quantity, 0), 0)
  const totalSpent = orders.reduce((sum, o) => sum + (o.total_inr || 0), 0)
  $('accountOrderCount').textContent = orders.length
  $('accountTotalSpent').textContent = formatINR(totalSpent)
  $('accountItemCount').textContent = totalItems

  const list = $('accountOrdersList')
  $('noOrders').style.display = orders.length ? 'none' : 'block'
  list.style.display = orders.length ? 'block' : 'none'

  list.innerHTML = orders
    .map((o) => {
      const date = new Date(o.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
      const delivery = o.fulfillment_status || 'processing'
      const ship = o.shipping_address
      return `
      <div class="order-item">
        <div class="order-header">
          <div>
            <div class="order-id">Order #${o.id.slice(0, 8)}</div>
            <div class="order-date">${date}</div>
          </div>
          <span class="order-status ${escapeHtml(delivery)}">${DELIVERY_LABELS[delivery] || escapeHtml(delivery)}</span>
        </div>
        <div class="order-items">
          ${o.order_items
            .map((i) => `<div class="order-item-detail"><strong>${escapeHtml(i.products?.title || 'Item')}</strong> × ${i.quantity}</div>`)
            .join('')}
        </div>
        ${
          ship
            ? `<div class="order-ship"><strong>Delivering to ${escapeHtml(ship.full_name)}</strong><br>${addressLines(ship).map(escapeHtml).join(', ')}</div>`
            : ''
        }
        <div class="order-footer">
          <span></span>
          <div class="order-total">Total: <strong>${formatINR(o.total_inr)}</strong></div>
        </div>
      </div>`
    })
    .join('')
}

// ===== SAVED ADDRESSES =====
async function loadAddresses() {
  const list = $('accountAddressList')
  try {
    addresses = await listAddresses()
  } catch (err) {
    console.error(err)
    list.innerHTML = '<p class="muted">Couldn’t load your addresses right now.</p>'
    return
  }

  if (addresses.length === 0) {
    list.innerHTML = '<p class="muted">No saved addresses yet — add one here or during checkout.</p>'
    return
  }

  list.innerHTML = addresses
    .map(
      (a) => `
    <div class="account-address${a.is_default ? ' is-default' : ''}">
      <div>${addressHtml(a).replace('</strong>', `</strong>${a.is_default ? '<span class="address-tag">Default</span>' : ''}`)}</div>
      <div class="account-address-actions">
        <button type="button" data-action="edit" data-id="${a.id}">Edit</button>
        ${a.is_default ? '' : `<button type="button" data-action="default" data-id="${a.id}">Make default</button>`}
        <button type="button" class="danger" data-action="delete" data-id="${a.id}">Delete</button>
      </div>
    </div>`
    )
    .join('')
}

$('accountAddressList').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]')
  if (!btn) return
  const { action, id } = btn.dataset
  try {
    if (action === 'edit') return openForm(addresses.find((a) => a.id === id))
    if (action === 'default') await setDefaultAddress(id)
    if (action === 'delete') {
      if (!confirm('Delete this address? Past orders keep their own copy of it.')) return
      await deleteAddress(id)
    }
    loadAddresses()
  } catch (err) {
    alert(`Something went wrong: ${err.message}`)
  }
})

function openForm(address = null) {
  const wrap = $('accountAddressFormWrap')
  wrap.hidden = false
  $('accountAddAddressBtn').hidden = true
  renderAddressForm(wrap, {
    address,
    defaults: {
      full_name: currentUser?.user_metadata?.full_name || '',
      phone: (currentUser?.user_metadata?.phone || '').replace(/\D/g, '').slice(-10),
    },
    onSaved: () => {
      closeForm()
      loadAddresses()
    },
    onCancel: closeForm,
  })
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeForm() {
  $('accountAddressFormWrap').hidden = true
  $('accountAddressFormWrap').innerHTML = ''
  $('accountAddAddressBtn').hidden = false
}

$('accountAddAddressBtn').addEventListener('click', () => openForm())
