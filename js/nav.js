// The "⋯" dropdown in the site header (shared by every page that has one)
export function initDropdownMenu() {
  const menuToggle = document.getElementById('menuToggle')
  const dropdownMenu = document.getElementById('dropdownMenu')
  if (!menuToggle || !dropdownMenu) return

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    dropdownMenu.classList.toggle('open')
  })
  dropdownMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => dropdownMenu.classList.remove('open'))
  })
  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
      dropdownMenu.classList.remove('open')
    }
  })
}
