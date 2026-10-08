// Escape user-submitted text before putting it into innerHTML
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ₹1800 → "₹1,800" (Indian digit grouping)
export function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN')
}

// Fallback artwork colours for products without a photo
const PALETTE = ['#E63A2E', '#2F5FFF', '#12B8A0', '#FFB020', '#8B5CF6']
export function fallbackGradient(index) {
  return `linear-gradient(135deg, ${PALETTE[index % PALETTE.length]}, #e0694f)`
}

let toastTimer = null
// Shows the page's #toast. Pass { label, onClick } to add an action button.
export function showToast(message, action) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`
  if (action) {
    const btn = document.createElement('button')
    btn.className = 'toast-action'
    btn.textContent = action.label
    btn.addEventListener('click', () => {
      toast.classList.remove('show')
      action.onClick()
    })
    toast.appendChild(btn)
  }
  toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500)
}
