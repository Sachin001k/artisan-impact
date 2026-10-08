import { supabase } from './supabaseClient.js'
import { trackVisit } from './track.js'
import { escapeHtml, formatINR } from './utils.js'

trackVisit()

const shell = document.getElementById('artistShell')
const params = new URLSearchParams(location.search)
const artistId = params.get('id')

async function init() {
  if (!artistId) {
    shell.innerHTML = `<p>No artist specified.</p>`
    return
  }

  const [{ data: artist, error: artistError }, { data: products }] = await Promise.all([
    supabase.from('artists').select('*').eq('id', artistId).single(),
    supabase.from('products').select('*').eq('artist_id', artistId).order('created_at', { ascending: false }),
  ])

  const visibleProducts = (products || []).filter((p) => p.is_active !== false)

  if (artistError || !artist) {
    shell.innerHTML = `<p>Couldn't find that artist.</p>`
    console.error(artistError)
    return
  }

  const name = escapeHtml(artist.name)
  const initials = escapeHtml(artist.name.slice(0, 2).toUpperCase())
  const pageUrl = `${location.origin}${location.pathname}?id=${artist.id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pageUrl)}`

  shell.innerHTML = `
    <div class="section-head">
      <div class="eyebrow">Artist</div>
      <h2>${name}${artist.age ? `, age ${artist.age}` : ''}</h2>
    </div>
    <div class="about-grid">
      <div>
        <div class="avatar" style="background:${escapeHtml(artist.avatar_color)}; width:96px; height:96px; font-size:1.5rem; margin:0 0 20px;">${initials}</div>
        <p style="color:rgba(27,38,32,0.75); font-size:1.05rem;">${escapeHtml(artist.bio || '')}</p>
      </div>
      <div>
        <div class="eyebrow">Scan to share this page</div>
        <div style="background:#fff; border-radius:14px; padding:24px; border:1px solid var(--line); text-align:center;">
          <img src="${qrUrl}" alt="QR code linking to ${name}'s artist page" width="180" height="180" style="margin:0 auto 14px; border-radius:8px;">
          <p style="font-size:0.85rem; color:rgba(27,38,32,0.6); margin-bottom:12px;">Print this on packaging or a shelf card — it opens ${name}'s story.</p>
          <a href="${qrUrl}" target="_blank" rel="noopener" class="btn btn-ghost" style="border-color:var(--ink); color:var(--ink);">Open full-size QR code</a>
        </div>
      </div>
    </div>

    <div class="section-head" style="margin-top:60px;">
      <div class="eyebrow">In the shop</div>
      <h2>Work by ${name}</h2>
    </div>
    <div class="shop-grid">
      ${
        visibleProducts.length
          ? visibleProducts
              .map(
                (p) => `
        <div class="polaroid">
          <div class="art-thumb" style="background:linear-gradient(135deg, ${escapeHtml(artist.avatar_color)}, #e0694f);">
            ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy">` : ''}
          </div>
          <h3>${escapeHtml(p.title)}</h3>
          <div class="p-meta"><span class="p-price">${formatINR(p.price_inr)}</span><a href="/#shop" class="btn btn-dark" style="padding:8px 16px; font-size:0.8rem;">View in shop</a></div>
        </div>`
              )
              .join('')
          : `<p>No pieces currently listed for this artist.</p>`
      }
    </div>
  `
}

init()
