import { supabase } from './supabaseClient.js'

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null))
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email, password, { fullName, phone } = {}) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  })
}

export function signOut() {
  return supabase.auth.signOut()
}

export function getInitials(user) {
  const name = user?.user_metadata?.full_name?.trim()
  if (name) {
    const parts = name.split(/\s+/)
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }
  return (user?.email?.[0] || '?').toUpperCase()
}

export function openAuthModal(note) {
  const modal = document.getElementById('authModal')
  if (!modal) return
  if (note) document.getElementById('authNote').textContent = note
  document.getElementById('authError').textContent = ''
  modal.classList.add('open')
}

export function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('open')
}

export function initAuthUI() {
  const modal = document.getElementById('authModal')
  const accountArea = document.getElementById('accountArea')
  if (!modal || !accountArea) return

  const form = document.getElementById('authForm')
  const tabs = document.querySelectorAll('.auth-tab')
  const submitBtn = document.getElementById('authSubmit')
  const errorEl = document.getElementById('authError')
  const headingEl = document.getElementById('authHeading')
  const signupFields = document.getElementById('authSignupFields')
  const nameInput = document.getElementById('authName')
  const phoneInput = document.getElementById('authPhone')
  let mode = 'signin'

  function renderAccountArea(user) {
    if (user) {
      const initials = getInitials(user)
      const label = user.user_metadata?.full_name || user.email
      accountArea.innerHTML = `
        <a href="account.html" class="user-avatar" title="${label}">${initials}</a>
        <button class="account-toggle" id="signOutBtn">Sign out</button>
      `
      document.getElementById('signOutBtn').addEventListener('click', () => signOut())
    } else {
      accountArea.innerHTML = `<button class="account-toggle" id="accountToggle">Sign in</button>`
      document
        .getElementById('accountToggle')
        .addEventListener('click', () => openAuthModal('Sign in to your account.'))
    }
    const accountLink = document.getElementById('myAccountLink')
    if (accountLink) accountLink.style.display = user ? 'inline-flex' : 'none'
  }

  document.getElementById('authClose').addEventListener('click', closeAuthModal)

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      mode = tab.dataset.tab
      submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account'
      headingEl.textContent = mode === 'signin' ? 'Welcome back' : 'Create your account'
      signupFields.style.display = mode === 'signup' ? 'grid' : 'none'
      nameInput.required = mode === 'signup'
      phoneInput.required = mode === 'signup'
      errorEl.textContent = ''
    })
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    const email = document.getElementById('authEmail').value
    const password = document.getElementById('authPassword').value

    const { data, error } =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, { fullName: nameInput.value, phone: phoneInput.value })

    if (error) {
      errorEl.textContent = error.message
      return
    }
    if (mode === 'signup' && !data.session) {
      errorEl.textContent = "Account created — check your email to confirm it, then come back and sign in."
      return
    }
    form.reset()
    closeAuthModal()
  })

  onAuthChange(renderAccountArea)
}
