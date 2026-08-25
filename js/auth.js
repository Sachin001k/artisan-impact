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

  const signInScreen = document.getElementById('authSignInScreen')
  const signUpScreen = document.getElementById('authSignUpScreen')
  const signInForm = document.getElementById('authForm')
  const signUpForm = document.getElementById('authSignupForm')
  const signInError = document.getElementById('authError')
  const signUpError = document.getElementById('authSignupError')

  function switchToSignUp() {
    signInScreen.style.display = 'none'
    signUpScreen.style.display = 'block'
    signUpError.textContent = ''
  }

  function switchToSignIn() {
    signUpScreen.style.display = 'none'
    signInScreen.style.display = 'block'
    signInError.textContent = ''
  }

  function renderAccountArea(user) {
    if (user) {
      const initials = getInitials(user)
      const label = user.user_metadata?.full_name || user.email
      accountArea.innerHTML = `
        <a href="/account" class="user-avatar" title="${label}">${initials}</a>
        <button class="account-toggle" id="signOutBtn">Sign out</button>
      `
      document.getElementById('signOutBtn').addEventListener('click', () => signOut())
    } else {
      accountArea.innerHTML = `<button class="account-toggle" id="accountToggle">Sign in</button>`
      document
        .getElementById('accountToggle')
        .addEventListener('click', () => openAuthModal())
    }
    const accountLink = document.getElementById('myAccountLink')
    if (accountLink) accountLink.style.display = user ? 'inline-flex' : 'none'
  }

  document.getElementById('authClose').addEventListener('click', closeAuthModal)
  document.getElementById('switchToSignup').addEventListener('click', switchToSignUp)
  document.getElementById('switchToSignin').addEventListener('click', switchToSignIn)

  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    signInError.textContent = ''
    const email = document.getElementById('authEmail').value
    const password = document.getElementById('authPassword').value

    const { error } = await signIn(email, password)

    if (error) {
      signInError.textContent = error.message
      return
    }
    signInForm.reset()
    closeAuthModal()
    switchToSignIn()
  })

  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    signUpError.textContent = ''
    const name = document.getElementById('authName').value
    const phone = document.getElementById('authPhone').value
    const email = document.getElementById('authEmailSignup').value
    const password = document.getElementById('authPasswordSignup').value

    const { data, error } = await signUp(email, password, { fullName: name, phone })

    if (error) {
      signUpError.textContent = error.message
      return
    }
    if (!data.session) {
      signUpError.textContent = "Account created — check your email to confirm it, then sign in."
      signUpForm.reset()
      setTimeout(switchToSignIn, 2000)
      return
    }
    signUpForm.reset()
    closeAuthModal()
    switchToSignIn()
  })

  onAuthChange(renderAccountArea)
}
