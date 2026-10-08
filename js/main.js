import { loadProducts, filterProducts } from './shop.js'
import { renderCartBadge, openCartDrawer, closeCartDrawer } from './cart.js'
import { initCheckoutButton } from './checkout-button.js'
import { initDropdownMenu } from './nav.js'
import { initDonate } from './donate.js'
import { initVolunteerForm } from './volunteer.js'
import { loadStories } from './blog.js'
import { loadTestimonials, initTestimonialForm } from './testimonials.js'
import { initAuthUI } from './auth.js'
import { trackVisit } from './track.js'
import { loadSiteImages } from './site-images.js'

document.addEventListener('DOMContentLoaded', () => {
  trackVisit()
  loadSiteImages()
  loadProducts()
  renderCartBadge()
  initAuthUI()
  initCheckoutButton()
  initDonate()
  initVolunteerForm()
  loadStories()
  loadTestimonials()
  initTestimonialForm()

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'))
      chip.classList.add('active')
      filterProducts(chip.dataset.filter)
    })
  })

  document.getElementById('cartToggle').addEventListener('click', openCartDrawer)
  document.getElementById('cartClose').addEventListener('click', closeCartDrawer)
  document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCartDrawer()
  })

  initDropdownMenu()
})
