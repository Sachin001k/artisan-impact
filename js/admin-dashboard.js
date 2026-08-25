import { supabase } from './supabaseClient.js'
import { getUser } from './auth.js'

let currentUser = null
let revenueChart = null
let ordersChart = null

// ===== INITIALIZATION =====
async function initDashboard() {
  const user = await getUser()

  if (!user) {
    // No user signed in - show admin login form
    showAdminLoginForm()
    return
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')

  if (!isAdmin) {
    // User signed in but not an admin
    alert(`Access denied. Admin only.\n\nYour email: ${user.email}\n\nMake sure this email is in the Supabase admins table.`)
    await supabase.auth.signOut()
    showAdminLoginForm()
    return
  }

  // User is admin - show dashboard
  currentUser = user
  document.getElementById('adminEmail').textContent = user.email
  document.getElementById('adminLoginScreen').style.display = 'none'

  initSidebar()
  initEventListeners()
  await loadOverviewData()
}

// ===== SHOW ADMIN LOGIN FORM =====
function showAdminLoginForm() {
  document.getElementById('adminLoginScreen').style.display = 'flex'
  document.querySelector('.dashboard-container > aside').style.display = 'none'
  document.querySelector('.dashboard-container > main').style.display = 'none'

  document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin)
}

// ===== HIDE ADMIN LOGIN FORM =====
function hideAdminLoginForm() {
  document.getElementById('adminLoginScreen').style.display = 'none'
  document.querySelector('.dashboard-container > aside').style.display = 'flex'
  document.querySelector('.dashboard-container > main').style.display = 'flex'
}

// ===== HANDLE ADMIN LOGIN =====
async function handleAdminLogin(e) {
  e.preventDefault()

  const email = document.getElementById('adminLoginEmail').value
  const password = document.getElementById('adminLoginPassword').value
  const errorEl = document.getElementById('adminLoginError')

  try {
    errorEl.style.display = 'none'

    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      errorEl.textContent = error.message
      errorEl.style.display = 'block'
      return
    }

    if (!data.user) {
      // Try to sign up if first time
      const { data: signupData, error: signupError } = await supabase.auth.signUp({ email, password })

      if (signupError) {
        errorEl.textContent = signupError.message
        errorEl.style.display = 'block'
        return
      }

      errorEl.textContent = 'Account created. Please sign in now.'
      errorEl.style.color = '#12B8A0'
      errorEl.style.display = 'block'
      document.getElementById('adminLoginForm').reset()
      return
    }

    // Check if admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

    if (adminError || !isAdmin) {
      await supabase.auth.signOut()
      errorEl.textContent = `Access denied. Email "${email}" is not in the admin list.`
      errorEl.style.display = 'block'
      return
    }

    // Admin login successful
    hideAdminLoginForm()
    await initDashboard()
  } catch (error) {
    errorEl.textContent = 'An error occurred. Please try again.'
    errorEl.style.display = 'block'
  }
}

// ===== SIDEBAR NAVIGATION =====
function initSidebar() {
  const sidebarItems = document.querySelectorAll('.nav-item[data-section]')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const sidebarClose = document.getElementById('sidebarClose')
  const sidebar = document.getElementById('dashboardSidebar')

  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault()
      const section = item.dataset.section
      navigateToSection(section)

      // Close sidebar on mobile
      if (window.innerWidth < 768) {
        sidebar.classList.add('closed')
      }
    })
  })

  sidebarToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('closed')
  })

  sidebarClose?.addEventListener('click', () => {
    sidebar.classList.add('closed')
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove('closed')
    }
  })
}

function navigateToSection(section) {
  // Hide all sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'))

  // Show selected section
  const sectionEl = document.getElementById(section + 'Section')
  if (sectionEl) {
    sectionEl.classList.add('active')
  }

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'))
  document.querySelector(`[data-section="${section}"]`).classList.add('active')

  // Update page title
  const titles = {
    overview: 'Overview',
    orders: 'Orders',
    products: 'Products',
    customers: 'Customers',
    artisans: 'Artisans',
    donations: 'Donations',
    volunteers: 'Volunteers',
    reviews: 'Reviews',
    content: 'Content',
    analytics: 'Analytics',
    notifications: 'Notifications',
    settings: 'Settings',
    audit: 'Audit Log'
  }

  document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard'
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  })

  // KPI Card clicks
  document.querySelectorAll('.kpi-card[data-navigate]').forEach(card => {
    card.addEventListener('click', () => {
      const section = card.dataset.navigate
      navigateToSection(section)
    })
  })

  // Quick action buttons
  document.getElementById('newOrderBtn')?.addEventListener('click', () => {
    alert('New order workflow coming soon')
  })

  document.getElementById('newVolunteerBtn')?.addEventListener('click', () => {
    navigateToSection('volunteers')
  })

  document.getElementById('viewReportsBtn')?.addEventListener('click', () => {
    navigateToSection('analytics')
  })

  // Filter button
  document.getElementById('filterBtn')?.addEventListener('click', async () => {
    const from = document.getElementById('dateFrom').value
    const to = document.getElementById('dateTo').value
    if (from && to) {
      await loadOverviewData(from, to)
    }
  })

  // Orders page
  document.getElementById('orderFilterBtn')?.addEventListener('click', () => {
    loadOrders()
  })

  document.getElementById('orderSearch')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      loadOrders()
    }
  })

  // Modal close
  document.getElementById('orderModalClose')?.addEventListener('click', closeOrderModal)
  document.getElementById('orderModalCloseBtn')?.addEventListener('click', closeOrderModal)

  // Products page
  document.getElementById('productSearch')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      loadProducts()
    }
  })

  document.getElementById('productCategory')?.addEventListener('change', () => {
    loadProducts()
  })

  document.getElementById('productModalClose')?.addEventListener('click', closeProductModal)
  document.getElementById('productModalCloseBtn')?.addEventListener('click', closeProductModal)
}

// ===== LOAD OVERVIEW DATA =====
async function loadOverviewData(dateFrom = null, dateTo = null) {
  try {
    // Get date range (default: last 30 days)
    const to = dateTo ? new Date(dateTo) : new Date()
    const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

    await Promise.all([
      loadKPIs(from, to),
      loadCharts(from, to),
      loadRecentOrders(),
      loadRecentDonations(),
      loadReviewsQueue(),
      loadLoginActivity()
    ])
  } catch (error) {
    console.error('Error loading overview:', error)
  }
}

// ===== LOAD KPIs =====
async function loadKPIs(dateFrom, dateTo) {
  // Orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_inr, status, created_at')
    .eq('status', 'paid')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const paidOrders = orders || []
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_inr || 0), 0)

  document.getElementById('kpiOrders').textContent = paidOrders.length
  document.getElementById('kpiOrdersMeta').textContent = `₹${revenue.toLocaleString()}`
  document.getElementById('kpiRevenue').textContent = `₹${revenue.toLocaleString()}`
  document.getElementById('kpiRevenueMeta').textContent = `${paidOrders.length} orders`

  // Donations
  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount_inr')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const totalDonations = donations?.reduce((sum, d) => sum + (d.amount_inr || 0), 0) || 0
  document.getElementById('kpiDonations').textContent = `₹${totalDonations.toLocaleString()}`
  document.getElementById('kpiDonationsMeta').textContent = `${donations?.length || 0} donations`

  // Volunteers
  const { data: volunteers } = await supabase
    .from('volunteers')
    .select('id')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  document.getElementById('kpiVolunteers').textContent = volunteers?.length || 0
  document.getElementById('kpiVolunteersMeta').textContent = 'New signups'

  // Cart events
  const { data: cartEvents } = await supabase
    .from('cart_events')
    .select('id')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  document.getElementById('kpiCartAdds').textContent = cartEvents?.length || 0
  document.getElementById('kpiCartAddsMeta').textContent = 'Cart adds'

  // Reviews
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('id')
    .eq('approved', false)

  document.getElementById('kpiReviews').textContent = testimonials?.length || 0
  document.getElementById('kpiReviewsMeta').textContent = 'Pending approval'
}

// ===== LOAD CHARTS =====
async function loadCharts(dateFrom, dateTo) {
  // Get daily revenue data
  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, total_inr, status')
    .eq('status', 'paid')
    .gte('created_at', dateFrom.toISOString())
    .lte('created_at', dateTo.toISOString())

  const days = 30
  const revenueByDay = {}
  const ordersByDay = {}

  for (let i = 0; i < days; i++) {
    const date = new Date(dateFrom)
    date.setDate(date.getDate() + i)
    const dateKey = date.toISOString().split('T')[0]
    revenueByDay[dateKey] = 0
    ordersByDay[dateKey] = 0
  }

  orders?.forEach(order => {
    const dateKey = order.created_at.split('T')[0]
    revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + (order.total_inr || 0)
    ordersByDay[dateKey] = (ordersByDay[dateKey] || 0) + 1
  })

  const labels = Object.keys(revenueByDay).map(d => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart')
  if (revenueChart) revenueChart.destroy()
  revenueChart = new Chart(revenueCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: Object.values(revenueByDay),
        borderColor: '#E63A2E',
        backgroundColor: 'rgba(230, 58, 46, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#E63A2E'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  })

  // Orders Chart
  const ordersCtx = document.getElementById('ordersChart')
  if (ordersChart) ordersChart.destroy()
  ordersChart = new Chart(ordersCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Orders',
        data: Object.values(ordersByDay),
        backgroundColor: '#FFB020',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  })
}

// ===== LOAD RECENT ORDERS =====
async function loadRecentOrders() {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, user_id, total_inr, status, created_at')
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(5)

  const list = document.getElementById('recentOrdersList')
  if (!orders || orders.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No orders yet</p></div>'
    return
  }

  list.innerHTML = orders.map(order => `
    <div class="activity-item">
      <div class="activity-item-title">Order #${order.id.slice(0, 8)}</div>
      <div class="activity-item-meta">₹${order.total_inr} • ${new Date(order.created_at).toLocaleDateString()}</div>
    </div>
  `).join('')
}

// ===== LOAD RECENT DONATIONS =====
async function loadRecentDonations() {
  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount_inr, donor_name, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const list = document.getElementById('recentDonationsList')
  if (!donations || donations.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No donations yet</p></div>'
    return
  }

  list.innerHTML = donations.map(donation => `
    <div class="activity-item">
      <div class="activity-item-title">${donation.donor_name || 'Anonymous'}</div>
      <div class="activity-item-meta">₹${donation.amount_inr} • ${new Date(donation.created_at).toLocaleDateString()}</div>
    </div>
  `).join('')
}

// ===== LOAD REVIEWS QUEUE =====
async function loadReviewsQueue() {
  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('id, customer_name, rating, comment, created_at')
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const list = document.getElementById('reviewsQueueList')
  if (!testimonials || testimonials.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No reviews pending</p></div>'
    return
  }

  list.innerHTML = testimonials.map(review => `
    <div class="activity-item">
      <div class="activity-item-title">⭐ ${review.rating} • ${review.customer_name || 'Anonymous'}</div>
      <div class="activity-item-meta">${review.comment?.substring(0, 50)}...</div>
    </div>
  `).join('')
}

// ===== LOAD LOGIN ACTIVITY =====
async function loadLoginActivity() {
  const { data: logins } = await supabase
    .from('logins')
    .select('id, email, user_type, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const list = document.getElementById('loginActivityList')
  if (!list) return

  if (!logins || logins.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No login activity</p></div>'
    return
  }

  list.innerHTML = logins.map(login => {
    const badge = login.user_type === 'admin' ? '<span style="background:#FFB020; color:#1B2620; padding:2px 6px; border-radius:3px; font-size:0.7rem; font-weight:700;">ADMIN</span>' : ''
    return `
      <div class="activity-item">
        <div class="activity-item-title">${login.email} ${badge}</div>
        <div class="activity-item-meta">${new Date(login.created_at).toLocaleString()}</div>
      </div>
    `
  }).join('')
}

// ===== LOAD ORDERS =====
async function loadOrders() {
  try {
    const search = document.getElementById('orderSearch')?.value || ''
    const status = document.getElementById('orderStatus')?.value || ''

    let query = supabase
      .from('orders')
      .select('id, customer_email, user_id, total_inr, status, created_at')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) throw error

    const filtered = orders.filter(o => {
      if (!search) return true
      return o.id.includes(search) || (o.customer_email && o.customer_email.includes(search))
    })

    const tbody = document.getElementById('ordersTableBody')
    const stats = document.getElementById('ordersStats')

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No orders found</td></tr>'
      stats.innerHTML = ''
      return
    }

    tbody.innerHTML = filtered.map(order => `
      <tr onclick="openOrderModal('${order.id}')">
        <td><span class="order-id">#${order.id.slice(0, 8)}</span></td>
        <td>${order.customer_email || '—'}</td>
        <td>₹${order.total_inr}</td>
        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
        <td><button class="table-action-btn" onclick="event.stopPropagation(); openOrderModal('${order.id}')">View</button></td>
      </tr>
    `).join('')

    const paidCount = filtered.filter(o => o.status === 'paid').length
    const totalRevenue = filtered.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.total_inr || 0), 0)
    stats.innerHTML = `Showing ${filtered.length} orders • ${paidCount} paid • ₹${totalRevenue.toLocaleString()} revenue`
  } catch (error) {
    console.error('Error loading orders:', error)
    document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="6" style="color:red; text-align:center;">Error loading orders</td></tr>'
  }
}

// ===== OPEN ORDER MODAL =====
async function openOrderModal(orderId) {
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return

  const { data: items } = await supabase
    .from('order_items')
    .select('*, products(title, price_inr)')
    .eq('order_id', orderId)

  const modal = document.getElementById('orderModal')
  const body = document.getElementById('orderModalBody')

  body.innerHTML = `
    <div class="order-detail-row">
      <span class="order-detail-label">Order ID</span>
      <span class="order-detail-value">${order.id.slice(0, 8)}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Customer Email</span>
      <span class="order-detail-value">${order.customer_email || '—'}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Status</span>
      <span class="order-detail-value"><span class="status-badge status-${order.status}">${order.status}</span></span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Total</span>
      <span class="order-detail-value">₹${order.total_inr}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Date</span>
      <span class="order-detail-value">${new Date(order.created_at).toLocaleString()}</span>
    </div>
    <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--line);">
      <h4 style="margin:0 0 12px 0;">Items</h4>
      ${items?.map(item => `
        <div style="padding:8px 0; border-bottom:1px solid var(--line); font-size:0.9rem;">
          <div><strong>${item.products?.title || 'Item'}</strong> × ${item.quantity}</div>
          <div style="color:rgba(27,38,32,0.6);">₹${item.products?.price_inr || 0} each</div>
        </div>
      `).join('') || '<p>No items</p>'}
    </div>
  `

  modal.classList.add('open')
}

// ===== CLOSE ORDER MODAL =====
function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open')
}

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  try {
    const search = document.getElementById('productSearch')?.value || ''
    const category = document.getElementById('productCategory')?.value || ''

    let query = supabase
      .from('products')
      .select('id, title, artist, price_inr, category, image_url')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: allProducts, error } = await query

    if (error) throw error

    const filtered = allProducts.filter(p => {
      if (!search) return true
      return p.title.toLowerCase().includes(search.toLowerCase()) ||
             p.artist.toLowerCase().includes(search.toLowerCase())
    })

    const grid = document.getElementById('productsGrid')
    const stats = document.getElementById('productsStats')

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:rgba(27,38,32,0.6);">No products found</div>'
      stats.innerHTML = ''
      return
    }

    grid.innerHTML = filtered.map(product => `
      <div class="product-card" onclick="openProductModal('${product.id}')">
        <div class="product-image">
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.title}">` : '🎨'}
        </div>
        <div class="product-info">
          <div class="product-title">${product.title}</div>
          <div class="product-artist">${product.artist}</div>
          <div class="product-meta">
            <span class="product-price">₹${product.price_inr}</span>
            <span class="product-category">${product.category}</span>
          </div>
        </div>
      </div>
    `).join('')

    stats.innerHTML = `Showing ${filtered.length} products`
  } catch (error) {
    console.error('Error loading products:', error)
    document.getElementById('productsGrid').innerHTML = '<div style="color:red; text-align:center;">Error loading products</div>'
  }
}

// ===== OPEN PRODUCT MODAL =====
async function openProductModal(productId) {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) return

  const modal = document.getElementById('productModal')
  const body = document.getElementById('productModalBody')

  body.innerHTML = `
    <div style="margin-bottom:20px;">
      ${product.image_url ? `<img src="${product.image_url}" alt="${product.title}" style="width:100%; max-height:300px; object-fit:cover; border-radius:8px; margin-bottom:16px;">` : ''}
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Title</span>
      <span class="order-detail-value">${product.title}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Artist</span>
      <span class="order-detail-value">${product.artist}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Category</span>
      <span class="order-detail-value"><span class="product-category">${product.category}</span></span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Price</span>
      <span class="order-detail-value">₹${product.price_inr}</span>
    </div>
    <div class="order-detail-row">
      <span class="order-detail-label">Created</span>
      <span class="order-detail-value">${new Date(product.created_at).toLocaleDateString()}</span>
    </div>
  `

  modal.classList.add('open')
}

// ===== CLOSE PRODUCT MODAL =====
function closeProductModal() {
  document.getElementById('productModal').classList.remove('open')
}

// Make functions global
window.openOrderModal = openOrderModal
window.closeOrderModal = closeOrderModal
window.loadOrders = loadOrders
window.openProductModal = openProductModal
window.closeProductModal = closeProductModal
window.loadProducts = loadProducts

// ===== START =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is already admin, show login form if not
  await initDashboard()

  // Load orders/products when navigating to sections
  const origNavigate = window.navigateToSection
  window.navigateToSection = function(section) {
    origNavigate(section)
    if (section === 'orders') {
      setTimeout(() => loadOrders(), 100)
    } else if (section === 'products') {
      setTimeout(() => loadProducts(), 100)
    }
  }
})
