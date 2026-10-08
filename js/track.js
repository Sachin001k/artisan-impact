import { supabase } from './supabaseClient.js'

const VISITOR_KEY = 'ai_visitor_id'
const SESSION_KEY = 'ai_visit_logged'

// A random id kept in this browser, so the admin Statistics card can count
// distinct people rather than page loads. Not linked to any personal data.
export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

// Logs one visit per browser session
export function trackVisit() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {}

  supabase
    .from('page_views')
    .insert({ visitor_id: getVisitorId(), path: location.pathname })
    .then(({ error }) => error && console.warn('Visit not logged:', error.message))
}
