import { supabase } from './supabaseClient.js'

// Every place on the website whose image the admin can change.
// The homepage marks each spot with data-image-slot="<key>"; the admin
// "Site Images" page lists these same slots with an upload button.
// To add a new slot: add it here, then put data-image-slot="<key>" on the element.
export const IMAGE_SLOTS = [
  { key: 'hero', section: 'Hero (top of homepage)', label: 'Main hero image' },
  { key: 'about', section: 'About Me', label: 'Founder photo' },
  { key: 'journey-1-before', section: 'Process to Product — card 1', label: 'Before' },
  { key: 'journey-1-after', section: 'Process to Product — card 1', label: 'After' },
  { key: 'journey-2-before', section: 'Process to Product — card 2', label: 'Before' },
  { key: 'journey-2-after', section: 'Process to Product — card 2', label: 'After' },
  { key: 'journey-3-before', section: 'Process to Product — card 3', label: 'Before' },
  { key: 'journey-3-after', section: 'Process to Product — card 3', label: 'After' },
]

export async function fetchSiteImages() {
  const { data, error } = await supabase.from('site_images').select('slot, image_url')
  if (error) {
    console.warn('Could not load site images:', error.message)
    return {}
  }
  return Object.fromEntries(data.map((row) => [row.slot, row.image_url]))
}

// Swap in admin-uploaded images; anything without an upload keeps its built-in default
export async function loadSiteImages() {
  const images = await fetchSiteImages()
  document.querySelectorAll('[data-image-slot]').forEach((el) => {
    const url = images[el.dataset.imageSlot]
    if (!url) return
    if (el.tagName === 'IMG') {
      el.src = url
    } else {
      el.style.backgroundImage = `url("${url}")`
      el.classList.add('has-image')
    }
  })
}
