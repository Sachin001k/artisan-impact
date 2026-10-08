// Add / edit delivery address form with a map:
//   • "Use my current location" → drops a pin and fills in the address
//   • drag the pin (or tap the map) to fine-tune → address re-fills
//   • typing a 6-digit pincode fills in city + state
// Map: Leaflet + OpenStreetMap (free, no API key). Leaflet is only
// downloaded the first time this form opens, so other pages stay fast.

import { supabase } from './supabaseClient.js'
import { saveAddress, INDIAN_STATES } from './addresses.js'
import { escapeHtml } from './utils.js'

const LEAFLET_VERSION = '1.9.4'
const INDIA_CENTER = [22.5, 79]
let leafletPromise = null

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
      document.head.appendChild(css)
      const script = document.createElement('script')
      script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
      script.onload = () => resolve(window.L)
      script.onerror = () => {
        leafletPromise = null
        reject(new Error('Map failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return leafletPromise
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Address lookup failed')
  const { address = {} } = await res.json()
  return {
    house: [address.house_number, address.building].filter(Boolean).join(', '),
    street: [address.road, address.neighbourhood || address.suburb].filter(Boolean).join(', '),
    // e.g. "Mumbai City District" → "Mumbai"
    city: (address.city || address.town || address.village || address.state_district || address.county || '')
      .replace(/\s+(city\s+)?district$/i, '')
      .replace(/\s+city$/i, ''),
    state: matchState(address.state),
    pincode: (address.postcode || '').replace(/\s/g, ''),
  }
}

async function lookupPincode(pincode) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: controller.signal })
    const [result] = await res.json()
    const office = result?.Status === 'Success' ? result.PostOffice?.[0] : null
    return office ? { city: office.District, state: matchState(office.State) } : null
  } finally {
    clearTimeout(timer)
  }
}

function matchState(name = '') {
  const n = name.toLowerCase()
  if (!n) return ''
  if (n.includes('delhi')) return 'Delhi'
  return INDIAN_STATES.find((s) => s.toLowerCase() === n) ||
    INDIAN_STATES.find((s) => n.includes(s.toLowerCase()) || s.toLowerCase().includes(n)) || ''
}

function validate(a) {
  if (a.full_name.length < 2) return 'Please enter the full name'
  if (!/^[6-9]\d{9}$/.test(a.phone)) return 'Please enter a valid 10-digit mobile number'
  if (a.line1.length < 3) return 'Please enter the flat / house number and building'
  if (!/^[1-9]\d{5}$/.test(a.pincode)) return 'Please enter a valid 6-digit pincode'
  if (!a.city) return 'Please enter the city'
  if (!a.state) return 'Please choose the state'
  return null
}

/**
 * Renders the form into `container`.
 * options: { address, defaults: { full_name, phone }, onSaved(address), onCancel(), submitLabel }
 * `defaults` is the signed-in customer's profile (from signup). When it has a
 * name + valid phone, those fields collapse to one "Receiver" line; if the
 * profile is missing either, whatever is typed here is saved back to it.
 */
export function renderAddressForm(container, { address = null, defaults = {}, onSaved, onCancel, submitLabel } = {}) {
  const a = address || { full_name: defaults.full_name || '', phone: defaults.phone || '' }
  const v = (key) => escapeHtml(a[key] ?? '')
  const profileComplete = Boolean(defaults.full_name) && /^[6-9]\d{9}$/.test(defaults.phone || '')
  // Collapse name/phone when they're simply the customer's own details
  const collapseContact = profileComplete && a.full_name === defaults.full_name && a.phone === defaults.phone

  container.innerHTML = `
    <form class="address-form" novalidate>
      <div class="address-map-wrap">
        <div class="address-map" aria-label="Map — drag the pin to your delivery location"></div>
        <button type="button" class="btn btn-dark address-locate-btn">
          <span aria-hidden="true">📍</span> Use my current location
        </button>
      </div>
      <p class="address-map-status" aria-live="polite">Tap “Use my current location”, or drag the pin to where the order should arrive.</p>

      <div class="receiver-line"${collapseContact ? '' : ' hidden'}>
        <span><span class="receiver-label">Receiver</span> ${v('full_name')} · +91 ${v('phone')}</span>
        <button type="button" class="receiver-change">Change</button>
      </div>
      <div class="field-row contact-fields"${collapseContact ? ' hidden' : ''}>
        <div><label>Receiver's full name</label><input name="full_name" autocomplete="name" required value="${v('full_name')}"></div>
        <div><label>Receiver's mobile number</label><input name="phone" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit mobile" required value="${v('phone')}"></div>
      </div>
      <div><label>Flat, house no., building</label><input name="line1" autocomplete="address-line1" required value="${v('line1')}"></div>
      <div><label>Area, street, sector</label><input name="line2" autocomplete="address-line2" value="${v('line2')}"></div>
      <div class="field-row">
        <div><label>Landmark <span class="optional">(optional)</span></label><input name="landmark" placeholder="e.g. near Apollo Hospital" value="${v('landmark')}"></div>
        <div><label>Pincode</label><input name="pincode" inputmode="numeric" maxlength="6" autocomplete="postal-code" required value="${v('pincode')}"></div>
      </div>
      <div class="field-row">
        <div><label>City / district</label><input name="city" autocomplete="address-level2" required value="${v('city')}"></div>
        <div>
          <label>State</label>
          <select name="state" required>
            <option value="">Choose state</option>
            ${INDIAN_STATES.map((s) => `<option${s === a.state ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <label class="address-default"><input type="checkbox" name="is_default"${a.is_default || !address ? ' checked' : ''}> Make this my default address</label>

      <p class="address-error" role="alert" hidden></p>
      <div class="address-actions">
        ${onCancel ? '<button type="button" class="btn btn-outline-dark address-cancel">Cancel</button>' : ''}
        <button type="submit" class="btn btn-primary">${escapeHtml(submitLabel || (address ? 'Save changes' : 'Save address'))}</button>
      </div>
    </form>`

  const form = container.querySelector('form')
  const statusEl = form.querySelector('.address-map-status')
  const errorEl = form.querySelector('.address-error')
  const field = (name) => form.elements[name]
  let coords = a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null
  let marker = null
  let map = null

  const setStatus = (text) => (statusEl.textContent = text)

  // Fill blanks freely; only overwrite what the customer typed when a new location is chosen
  function fillFromLocation(found) {
    if (found.house && !field('line1').value) field('line1').value = found.house
    if (found.street) field('line2').value = found.street
    if (found.city) field('city').value = found.city
    if (found.state) field('state').value = found.state
    if (found.pincode && /^\d{6}$/.test(found.pincode)) field('pincode').value = found.pincode
  }

  let geocodeTimer = null
  function placePin(lat, lng, { zoom, lookup = true } = {}) {
    coords = { lat, lng }
    if (!map) return
    if (!marker) {
      marker = window.L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.on('dragend', () => {
        const p = marker.getLatLng()
        placePin(p.lat, p.lng)
      })
    } else {
      marker.setLatLng([lat, lng])
    }
    map.setView([lat, lng], zoom || Math.max(map.getZoom(), 16))
    if (!lookup) return

    clearTimeout(geocodeTimer)
    setStatus('Finding the address for this spot…')
    geocodeTimer = setTimeout(async () => {
      try {
        fillFromLocation(await reverseGeocode(lat, lng))
        setStatus('Address filled in from the map — please check it and add your flat / house number.')
      } catch {
        setStatus('Pin saved. We couldn’t look up the address automatically — please type it below.')
      }
    }, 600) // OpenStreetMap's lookup service allows ~1 request per second
  }

  loadLeaflet()
    .then((L) => {
      map = L.map(form.querySelector('.address-map'), { scrollWheelZoom: false }).setView(
        coords ? [coords.lat, coords.lng] : INDIA_CENTER,
        coords ? 16 : 4
      )
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      if (coords) placePin(coords.lat, coords.lng, { lookup: false })
      map.on('click', (e) => placePin(e.latlng.lat, e.latlng.lng))
      // The form may have been hidden while the map initialised
      setTimeout(() => map.invalidateSize(), 200)
    })
    .catch(() => {
      form.querySelector('.address-map-wrap').hidden = true
      setStatus('The map couldn’t load — you can still type your address below.')
    })

  form.querySelector('.address-locate-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return setStatus('Your browser can’t share its location — please type your address below.')
    setStatus('Getting your location…')
    navigator.geolocation.getCurrentPosition(
      (pos) => placePin(pos.coords.latitude, pos.coords.longitude, { zoom: 17 }),
      (err) =>
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was blocked. Allow it in your browser’s address bar, or drag the pin / type your address.'
            : 'Couldn’t get your location — drag the pin or type your address below.'
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })

  // Digits only for phone and pincode; pincode auto-fills city + state
  field('phone').addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10)))
  field('pincode').addEventListener('input', async (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6)
    if (!/^[1-9]\d{5}$/.test(e.target.value)) return
    try {
      const found = await lookupPincode(e.target.value)
      if (found?.city && !field('city').value) field('city').value = found.city
      if (found?.state) field('state').value = found.state
    } catch {} // lookup is a convenience only
  })

  form.querySelector('.receiver-change').addEventListener('click', () => {
    form.querySelector('.receiver-line').hidden = true
    form.querySelector('.contact-fields').hidden = false
    field('full_name').focus()
  })

  form.querySelector('.address-cancel')?.addEventListener('click', () => onCancel())

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const data = {
      full_name: field('full_name').value.trim(),
      phone: field('phone').value.trim(),
      line1: field('line1').value.trim(),
      line2: field('line2').value.trim() || null,
      landmark: field('landmark').value.trim() || null,
      city: field('city').value.trim(),
      state: field('state').value,
      pincode: field('pincode').value.trim(),
      is_default: field('is_default').checked,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    }
    const problem = validate(data)
    errorEl.hidden = !problem
    errorEl.textContent = problem || ''
    if (problem) {
      // Make sure a name/phone problem is visible even if those fields were collapsed
      if (/name|mobile/.test(problem)) {
        form.querySelector('.receiver-line').hidden = true
        form.querySelector('.contact-fields').hidden = false
      }
      return
    }

    const submitBtn = form.querySelector('[type="submit"]')
    submitBtn.disabled = true
    try {
      const saved = await saveAddress(data, address?.id)
      // Fill gaps in the customer's profile so they're never asked again
      if (!profileComplete) {
        const profile = {}
        if (!defaults.full_name) profile.full_name = data.full_name
        if (!/^[6-9]\d{9}$/.test(defaults.phone || '')) profile.phone = data.phone
        supabase.auth.updateUser({ data: profile }).catch((err) => console.warn('Profile not updated', err))
      }
      onSaved?.(saved)
    } catch (err) {
      console.error(err)
      errorEl.textContent = /addresses/.test(err.message)
        ? 'Addresses aren’t set up yet — run sql/delivery-and-performance.sql in Supabase.'
        : `Couldn’t save the address: ${err.message}`
      errorEl.hidden = false
    } finally {
      submitBtn.disabled = false
    }
  })
}
