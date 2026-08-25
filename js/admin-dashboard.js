import { supabase } from './supabaseClient.js'
import { getUser } from './auth.js'

let currentUser = null
let revenueChart = null
let ordersChart = null

// ===== INITIALIZATION =====
async function initDashboard() {
  const user = await getUser()
  if (!user) {
    window.location.href = '/'
    return
  }

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    alert('Access denied. Admin only.')
    window.location.href = '/'
    return
  }

  currentUser = user
  document.getElementById('adminEmail').textContent = user.email

  initSidebar()
  initEventListeners()
  await loadOverviewData()
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

// ===== START =====
document.addEventListener('DOMContentLoaded', initDashboard)
