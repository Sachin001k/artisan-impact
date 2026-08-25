import { loadProducts, filterProducts } from './shop.js'
import { renderCartBadge, renderCartDrawer } from './cart.js'
import { initCheckout } from './checkout.js'
import { initDonate } from './donate.js'
import { initVolunteerForm } from './volunteer.js'
import { loadStories } from './blog.js'
import { loadTestimonials, initTestimonialForm } from './testimonials.js'
import { initAuthUI } from './auth.js'

document.addEventListener('DOMContentLoaded', () => {
  loadProducts()
  renderCartBadge()
  initAuthUI()
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

  const menuToggle = document.getElementById('menuToggle')
  const dropdownMenu = document.getElementById('dropdownMenu')
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation()
      dropdownMenu.classList.toggle('open')
    })
    dropdownMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        dropdownMenu.classList.remove('open')
      })
    })
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        dropdownMenu.classList.remove('open')
      }
    })
  }
})
