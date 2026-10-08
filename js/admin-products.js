// /admin → Products: every product is an editable card (photo, name, artist,
// price, category). "+ Add product" adds a blank card; "Remove from shop"
// deletes a product, or hides it if past orders / carts still point to it.

import { supabase } from './supabaseClient.js'
import { uploadImage } from './upload.js'
import { escapeHtml, formatINR, fallbackGradient } from './utils.js'

const CATEGORIES = [
  ['painting', 'Painting'],
  ['craft', 'Craft'],
  ['print', 'Print'],
]
const AVATAR_COLORS = ['#C8432E', '#3457D5', '#2F8F7E', '#E8A23B', '#8a5cd6', '#f2c06e']

let artists = []
let products = []
let grid = null

export function initProductsSection() {
  grid = document.getElementById('adminProductGrid')
  document.getElementById('addProductBtn').addEventListener('click', addBlankCard)
  document.getElementById('showHiddenProducts').addEventListener('change', render)

  grid.addEventListener('input', (e) => markDirty(e.target.closest('.ap-card')))
  grid.addEventListener('change', onChange)
  grid.addEventListener('submit', onSave)
  grid.addEventListener('click', onClick)
}

export async function loadProductsSection() {
  const [{ data: artistRows }, { data, error }] = await Promise.all([
    supabase.from('artists').select('id, name').order('name'),
    supabase.from('products').select('*').order('created_at', { ascending: false }),
  ])
  artists = artistRows || []
  document.getElementById('artistSuggestions').innerHTML = artists
    .map((a) => `<option value="${escapeHtml(a.name)}"></option>`)
    .join('')

  if (error) {
    grid.innerHTML = `<p class="stats-error">Couldn’t load products: ${escapeHtml(error.message)}</p>`
    return
  }
  products = data
  render()
}

// ===== RENDER =====
function render() {
  const showHidden = document.getElementById('showHiddenProducts').checked
  const visible = products.filter((p) => showHidden || p.is_active !== false)
  const hiddenCount = products.filter((p) => p.is_active === false).length
  document.getElementById('hiddenProductsCount').textContent = hiddenCount ? `(${hiddenCount})` : ''

  grid.innerHTML = visible.length
    ? visible.map((p, i) => cardHtml(p, i)).join('')
    : '<p class="text-muted">No products yet — click “+ Add product”.</p>'
}

function cardHtml(p, i) {
  const isNew = !p.id
  const hidden = p.is_active === false
  return `
  <form class="ap-card${hidden ? ' is-hidden' : ''}${isNew ? ' is-new' : ''}" data-id="${p.id || ''}" novalidate>
    <div class="ap-photo" style="background:${fallbackGradient(i)};">
      ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="">` : '<span class="ap-photo-empty">No photo yet</span>'}
      ${hidden ? '<span class="ap-badge">Hidden from shop</span>' : ''}
      <label class="ap-photo-btn">
        ${p.image_url ? 'Change photo' : 'Add photo'}
        <input type="file" accept="image/*" hidden>
      </label>
    </div>
    <input type="hidden" name="image_url" value="${escapeHtml(p.image_url || '')}">
    <div class="ap-fields">
      <label class="ap-label">Name<input name="title" required maxlength="80" value="${escapeHtml(p.title || '')}" placeholder="e.g. Monsoon in Marigold"></label>
      <label class="ap-label">Artist<input name="artist" list="artistSuggestions" required autocomplete="off" value="${escapeHtml(p.artist || '')}" placeholder="Type a name — new names are added"></label>
      <div class="ap-row">
        <label class="ap-label">Price (₹)<input name="price_inr" type="number" min="1" step="1" required value="${p.price_inr ?? ''}" placeholder="e.g. 450"></label>
        <label class="ap-label">Category
          <select name="category">
            ${CATEGORIES.map(([v, l]) => `<option value="${v}"${p.category === v ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
    <div class="ap-actions">
      <button type="submit" class="btn btn-dark ap-save"${isNew ? '' : ' disabled'}>${isNew ? 'Add to shop' : 'Save'}</button>
      ${
        isNew
          ? '<button type="button" class="ap-link" data-action="discard">Discard</button>'
          : hidden
            ? '<button type="button" class="ap-link" data-action="show">Show in shop</button>'
            : '<button type="button" class="ap-link danger" data-action="remove">Remove from shop</button>'
      }
    </div>
    <p class="ap-status" aria-live="polite"></p>
  </form>`
}

function setStatus(card, text, isError = false) {
  const el = card.querySelector('.ap-status')
  el.textContent = text
  el.classList.toggle('error', isError)
}

function markDirty(card) {
  if (!card) return
  card.querySelector('.ap-save').disabled = false
  if (card.dataset.id) setStatus(card, 'Unsaved changes')
}

function addBlankCard() {
  if (grid.querySelector('.ap-card.is-new')) {
    grid.querySelector('.ap-card.is-new input[name="title"]').focus()
    return
  }
  if (!grid.querySelector('.ap-card')) grid.innerHTML = ''
  grid.insertAdjacentHTML('afterbegin', cardHtml({ category: 'painting' }, 0))
  grid.querySelector('.ap-card.is-new input[name="title"]').focus()
}

// ===== PHOTO =====
async function onChange(e) {
  const input = e.target
  if (input.type !== 'file' || !input.files?.[0]) return
  const card = input.closest('.ap-card')
  setStatus(card, 'Uploading photo…')
  try {
    const url = await uploadImage(input.files[0], 'products')
    card.querySelector('input[name="image_url"]').value = url
    const photo = card.querySelector('.ap-photo')
    photo.querySelector('img, .ap-photo-empty')?.remove()
    photo.insertAdjacentHTML('afterbegin', `<img src="${escapeHtml(url)}" alt="">`)
    photo.querySelector('.ap-photo-btn').firstChild.textContent = 'Change photo '
    markDirty(card)
    setStatus(card, card.dataset.id ? 'Photo uploaded — click Save to put it in the shop' : 'Photo uploaded')
  } catch (err) {
    setStatus(card, `Photo upload failed: ${err.message}`, true)
  } finally {
    input.value = ''
  }
}

// ===== SAVE =====
// Typed name → existing artist (ignoring capitals), or a new artist row.
// If the artist can't be created, the product still saves with the name.
async function resolveArtist(name) {
  const existing = artists.find((a) => a.name.trim().toLowerCase() === name.toLowerCase())
  if (existing) return { id: existing.id, name: existing.name }
  const { data, error } = await supabase
    .from('artists')
    .insert({ name, avatar_color: AVATAR_COLORS[artists.length % AVATAR_COLORS.length] })
    .select('id, name')
    .single()
  if (error) {
    console.warn('Could not create artist — run sql/admin-artists.sql in Supabase', error)
    return { id: null, name }
  }
  artists.push(data)
  return data
}

async function onSave(e) {
  e.preventDefault()
  const card = e.target
  const f = card.elements
  const title = f.title.value.trim()
  const artistName = f.artist.value.trim().replace(/\s+/g, ' ')
  const price = Math.round(Number(f.price_inr.value))

  if (!title) return setStatus(card, 'Please enter a name', true)
  if (!artistName) return setStatus(card, 'Please enter the artist', true)
  if (!Number.isFinite(price) || price < 1) return setStatus(card, 'Price must be at least ₹1', true)

  const saveBtn = card.querySelector('.ap-save')
  saveBtn.disabled = true
  setStatus(card, 'Saving…')

  // Keep an existing display name like "Aanya, age 11" if the artist didn't change
  const original = products.find((p) => p.id === card.dataset.id)
  const artist = original && original.artist === artistName ? { id: original.artist_id, name: artistName } : await resolveArtist(artistName)
  const fields = {
    title,
    artist: artist.name,
    artist_id: artist.id,
    price_inr: price,
    category: f.category.value,
    image_url: f.image_url.value || null,
  }

  const id = card.dataset.id
  const query = id
    ? supabase.from('products').update(fields).eq('id', id).select()
    : supabase.from('products').insert(fields).select()
  const { data, error } = await query

  if (error || !data?.length) {
    saveBtn.disabled = false
    return setStatus(card, error ? `Couldn’t save: ${error.message}` : 'Not allowed — run sql/stats-and-images.sql in Supabase', true)
  }

  const saved = data[0]
  if (id) products = products.map((p) => (p.id === id ? saved : p))
  else products.unshift(saved)
  render()
  const fresh = grid.querySelector(`.ap-card[data-id="${saved.id}"]`)
  if (fresh) setStatus(fresh, `✓ Saved — live in the shop at ${formatINR(saved.price_inr)}`)
}

// ===== REMOVE / SHOW =====
async function onClick(e) {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const card = btn.closest('.ap-card')
  const id = card.dataset.id
  const action = btn.dataset.action

  if (action === 'discard') {
    card.remove()
    if (!grid.querySelector('.ap-card')) render()
    return
  }

  if (action === 'show') return setVisibility(card, id, true)

  if (action === 'remove') {
    const p = products.find((x) => x.id === id)
    if (!confirm(`Remove “${p?.title}” from the shop?`)) return
    // Delete if nothing points to it; otherwise (ordered / in cart history) hide it
    const { data: deleted, error } = await supabase.from('products').delete().eq('id', id).select('id')
    if (!error && deleted?.length) {
      products = products.filter((x) => x.id !== id)
      return render()
    }
    if (error && error.code !== '23503') return setStatus(card, `Couldn’t remove: ${error.message}`, true)
    return setVisibility(card, id, false)
  }
}

async function setVisibility(card, id, isActive) {
  const { data, error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id).select()
  if (error || !data?.length) {
    const needsSql = /is_active/.test(error?.message || '')
    return setStatus(
      card,
      needsSql
        ? 'This product has past orders, so it can only be hidden — run sql/product-visibility.sql in Supabase first.'
        : `Couldn’t update: ${error?.message || 'not allowed'}`,
      true
    )
  }
  products = products.map((p) => (p.id === id ? data[0] : p))
  render()
}
