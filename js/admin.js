import { supabase } from './supabaseClient.js'
import { signIn, signUp, signOut, getUser } from './auth.js'

const loginShell = document.getElementById('adminLogin')
const dashShell = document.getElementById('adminDashboard')
const loginForm = document.getElementById('adminLoginForm')
const loginError = document.getElementById('adminLoginError')
const submitBtn = document.getElementById('adminSubmit')
const tabs = document.querySelectorAll('.auth-tab')
let mode = 'signin'

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    mode = tab.dataset.tab
    submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account'
    loginError.textContent = ''
  })
})

function showLogin() {
  loginShell.style.display = 'block'
  dashShell.style.display = 'none'
}

function showDashboard(user) {
  loginShell.style.display = 'none'
  dashShell.style.display = 'block'
  document.getElementById('adminWho').textContent = user.email
  loadDashboard()
}

async function checkAccess() {
  const user = await getUser()
  if (!user) return showLogin()

  const { data: isAdmin, error } = await supabase.rpc('is_admin')
  if (error || !isAdmin) {
    loginError.textContent = error ? error.message : "This account doesn't have admin access."
    await signOut()
    return showLogin()
  }
  showDashboard(user)
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  loginError.textContent = ''
  const email = document.getElementById('adminEmail').value
  const password = document.getElementById('adminPassword').value

  const { data, error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
  if (error) {
    loginError.textContent = error.message
    return
  }
  if (mode === 'signup' && !data.session) {
    loginError.textContent = 'Check your email to confirm the account, then sign in.'
    return
  }
  checkAccess()
})

document.getElementById('adminSignOut').addEventListener('click', async () => {
  await signOut()
  showLogin()
})

async function loadDashboard() {
  const [{ data: orders }, { data: donations }, { data: volunteers }, { data: testimonials }, { data: cartEvents }] =
    await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('donations').select('*').order('created_at', { ascending: false }),
      supabase.from('volunteers').select('*').order('created_at', { ascending: false }),
      supabase.from('testimonials').select('*').order('created_at', { ascending: false }),
      supabase.from('cart_events').select('*, products(title)').order('created_at', { ascending: false }),
    ])

  renderStats({ orders, donations, volunteers, testimonials, cartEvents })
  renderOrders(orders)
  renderDonations(donations)
  renderVolunteers(volunteers)
  renderTestimonials(testimonials)
  renderCartEvents(cartEvents)
}

function renderStats({ orders, donations, volunteers, testimonials, cartEvents }) {
  const paidOrders = (orders || []).filter((o) => o.status === 'paid')
  const revenue = paidOrders.reduce((sum, o) => sum + (o.total_inr || 0), 0)
  const donationTotal = (donations || []).reduce((sum, d) => sum + (d.amount_inr || 0), 0)
  const pending = (testimonials || []).filter((t) => !t.approved).length

  document.getElementById('statOrders').textContent = paidOrders.length
  document.getElementById('statRevenue').textContent = `₹${revenue}`
  document.getElementById('statDonations').textContent = `₹${donationTotal}`
  document.getElementById('statVolunteers').textContent = (volunteers || []).length
  document.getElementById('statCartAdds').textContent = (cartEvents || []).length
  document.getElementById('statPendingReviews').textContent = pending
}

function renderOrders(orders) {
  const el = document.getElementById('ordersList')
  if (!orders || orders.length === 0) {
    el.innerHTML = '<p>No orders yet.</p>'
    return
  }
  el.innerHTML = orders
    .slice(0, 20)
    .map(
      (o) => `
    <div class="admin-row">
      <span>${o.customer_email || '—'}</span>
      <span>₹${o.total_inr}</span>
      <span class="admin-status admin-status-${o.status}">${o.status}</span>
      <span>${new Date(o.created_at).toLocaleDateString()}</span>
    </div>`
    )
    .join('')
}

function renderDonations(donations) {
  const el = document.getElementById('donationsList')
  if (!donations || donations.length === 0) {
    el.innerHTML = '<p>No donations yet.</p>'
    return
  }
  el.innerHTML = donations
    .slice(0, 20)
    .map(
      (d) => `
    <div class="admin-row">
      <span>${d.donor_email || '—'}</span>
      <span>₹${d.amount_inr}</span>
      <span>${new Date(d.created_at).toLocaleDateString()}</span>
    </div>`
    )
    .join('')
}

function renderVolunteers(volunteers) {
  const el = document.getElementById('volunteersList')
  if (!volunteers || volunteers.length === 0) {
    el.innerHTML = '<p>No volunteer signups yet.</p>'
    return
  }
  el.innerHTML = volunteers
    .slice(0, 20)
    .map(
      (v) => `
    <div class="admin-row">
      <span>${v.name}</span>
      <span>${v.email}</span>
      <span>${v.interest_area || '—'}</span>
      <span>${new Date(v.created_at).toLocaleDateString()}</span>
    </div>`
    )
    .join('')
}

function renderTestimonials(testimonials) {
  const el = document.getElementById('testimonialsList')
  if (!testimonials || testimonials.length === 0) {
    el.innerHTML = '<p>No reviews yet.</p>'
    return
  }
  el.innerHTML = testimonials
    .map(
      (t) => `
    <div class="admin-row">
      <span>${t.customer_name}</span>
      <span>${'★'.repeat(t.rating || 0)}</span>
      <span>${t.quote}</span>
      <span>${
        t.approved ? 'Approved' : `<button class="btn btn-dark admin-approve" data-id="${t.id}">Approve</button>`
      }</span>
    </div>`
    )
    .join('')

  el.querySelectorAll('.admin-approve').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { error } = await supabase.from('testimonials').update({ approved: true }).eq('id', btn.dataset.id)
      if (error) console.error(error)
      else loadDashboard()
    })
  })
}

function renderCartEvents(cartEvents) {
  const el = document.getElementById('cartEventsList')
  if (!cartEvents || cartEvents.length === 0) {
    el.innerHTML = '<p>No cart activity yet.</p>'
    return
  }
  const counts = {}
  cartEvents.forEach((c) => {
    const title = c.products?.title || 'Unknown product'
    counts[title] = (counts[title] || 0) + 1
  })
  el.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([title, count]) => `<div class="admin-row"><span>${title}</span><span>${count} adds</span></div>`)
    .join('')
}

checkAccess()
