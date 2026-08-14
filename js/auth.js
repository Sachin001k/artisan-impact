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

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
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
  const toggle = document.getElementById('accountToggle')
  if (!modal || !toggle) return

  const form = document.getElementById('authForm')
  const tabs = document.querySelectorAll('.auth-tab')
  const submitBtn = document.getElementById('authSubmit')
  const errorEl = document.getElementById('authError')
  let mode = 'signin'

  toggle.addEventListener('click', async () => {
    const user = await getUser()
    if (user) {
      await signOut()
    } else {
      openAuthModal('Sign in to your account.')
    }
  })
  document.getElementById('authClose').addEventListener('click', closeAuthModal)

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      mode = tab.dataset.tab
      submitBtn.textContent = mode === 'signin' ? 'Sign in' : 'Create account'
      errorEl.textContent = ''
    })
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''
    const email = document.getElementById('authEmail').value
    const password = document.getElementById('authPassword').value

    const { data, error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)

    if (error) {
      errorEl.textContent = error.message
      return
    }
    if (mode === 'signup' && !data.session) {
      errorEl.textContent = 'Check your email to confirm your account, then sign in.'
      return
    }
    form.reset()
    closeAuthModal()
  })

  onAuthChange((user) => {
    toggle.textContent = user ? `Sign out (${user.email})` : 'Sign in'
    const accountLink = document.getElementById('myAccountLink')
    if (accountLink) accountLink.style.display = user ? 'inline-flex' : 'none'
  })
}
