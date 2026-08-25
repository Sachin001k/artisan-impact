import { supabase } from './supabaseClient.js'
import { getUser, onAuthChange, initAuthUI, openAuthModal, getInitials } from './auth.js'

const signedOutShell = document.getElementById('accountSignedOut')
const dashboardShell = document.getElementById('accountDashboard')

initAuthUI()

// Dropdown menu toggle
const menuToggle = document.getElementById('menuToggle')
const dropdownMenu = document.getElementById('dropdownMenu')
if (menuToggle) {
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdownMenu.classList.toggle('open')
  })
  dropdownMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      dropdownMenu.classList.remove('open')
    })
  })
  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      dropdownMenu.classList.remove('open')
    }
  })
}

document.getElementById('accountSignInBtn').addEventListener('click', () => {
  openAuthModal('Sign in to see your stats.')
})

onAuthChange((user) => {
  if (user) {
    checkIfAdminAndShow(user)
  } else {
    signedOutShell.style.display = 'block'
    dashboardShell.style.display = 'none'
  }
})

async function checkIfAdminAndShow(user) {
  const { data: isAdmin } = await supabase.rpc('is_admin')

  if (isAdmin) {
    signedOutShell.style.display = 'block'
    dashboardShell.style.display = 'none'
    signedOutShell.innerHTML = `
      <div class="section-head">
        <div class="eyebrow">Admin Access</div>
        <h2>You're signed in as admin</h2>
        <p>Your account is registered as an admin. Go to your admin dashboard to manage the site.</p>
      </div>
      <a href="/admin" class="btn btn-dark">Go to Admin Dashboard</a>
    `
    return
  }

  showDashboard(user)
}

async function showDashboard(user) {
  signedOutShell.style.display = 'none'
  dashboardShell.style.display = 'block'
  document.getElementById('accountName').textContent = user.user_metadata?.full_name || user.email
  document.getElementById('accountAvatar').textContent = getInitials(user)

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (ordersError) {
    console.error(ordersError)
    return
  }

  const paidOrders = (orders || []).filter((o) => o.status === 'paid')
  const orderIds = paidOrders.map((o) => o.id)

  let itemsByOrder = {}
  let totalItems = 0
  if (orderIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*, products(title, price_inr)')
      .in('order_id', orderIds)

    if (itemsError) {
      console.error(itemsError)
    } else {
      totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
      itemsByOrder = items.reduce((acc, i) => {
        acc[i.order_id] = acc[i.order_id] || []
        acc[i.order_id].push(i)
        return acc
      }, {})
    }
  }

  const totalSpent = paidOrders.reduce((sum, o) => sum + (o.total_inr || 0), 0)

  document.getElementById('accountOrderCount').textContent = paidOrders.length
  document.getElementById('accountTotalSpent').textContent = `₹${totalSpent}`
  document.getElementById('accountItemCount').textContent = totalItems

  const list = document.getElementById('accountOrdersList')
  if (orders.length === 0) {
    list.innerHTML = '<p>You haven\'t placed an order yet — <a href="index.html#shop" style="text-decoration:underline;">browse the shop</a>.</p>'
    return
  }

  list.innerHTML = orders
    .map((o) => {
      const items = itemsByOrder[o.id] || []
      const itemsLabel = items.length
        ? items.map((i) => `${i.products?.title || 'Item'} × ${i.quantity}`).join(', ')
        : '—'
      return `
      <div class="admin-row">
        <span>${new Date(o.created_at).toLocaleDateString()}</span>
        <span>${itemsLabel}</span>
        <span>₹${o.total_inr}</span>
        <span class="admin-status admin-status-${o.status}">${o.status}</span>
      </div>`
    })
    .join('')
}

;(async () => {
  const user = await getUser()
  if (user) showDashboard(user)
  else {
    signedOutShell.style.display = 'block'
    dashboardShell.style.display = 'none'
  }
})()
