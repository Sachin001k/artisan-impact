import { loadProducts, filterProducts } from './shop.js'
import { renderCartBadge, renderCartDrawer } from './cart.js'
import { initCheckout } from './checkout.js'
import { initDonate } from './donate.js'
import { initVolunteerForm } from './volunteer.js'
import { loadStories } from './blog.js'
import { loadTestimonials, initTestimonialForm } from './testimonials.js'

document.addEventListener('DOMContentLoaded', () => {
  loadProducts()
  renderCartBadge()
  initCheckout()
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

  const cartToggle = document.getElementById('cartToggle')
  const cartDrawer = document.getElementById('cartDrawer')
  cartToggle.addEventListener('click', () => {
    cartDrawer.classList.toggle('open')
    renderCartDrawer()
  })
  document.getElementById('cartClose').addEventListener('click', () => {
    cartDrawer.classList.remove('open')
  })
})
