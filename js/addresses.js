import { supabase } from './supabaseClient.js'
import { escapeHtml } from './utils.js'

// ===== DATA =====
// Row Level Security makes every query here return only the signed-in
// customer's own addresses.

export async function listAddresses() {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveAddress(address, id) {
  const query = id
    ? supabase.from('addresses').update(address).eq('id', id)
    : supabase.from('addresses').insert(address)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function deleteAddress(id) {
  const { error } = await supabase.from('addresses').delete().eq('id', id)
  if (error) throw error
}

export async function setDefaultAddress(id) {
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
  if (error) throw error
}

// ===== DISPLAY =====

export function addressLines(a) {
  return [
    [a.line1, a.line2].filter(Boolean).join(', '),
    a.landmark ? `Near ${a.landmark}` : '',
    `${a.city}, ${a.state} – ${a.pincode}`,
  ].filter(Boolean)
}

// Small read-only block: name, address lines, phone
export function addressHtml(a) {
  if (!a) return '<span class="muted">No address on file</span>'
  return `
    <strong>${escapeHtml(a.full_name)}</strong><br>
    ${addressLines(a).map(escapeHtml).join('<br>')}<br>
    <span class="muted">Phone: ${escapeHtml(a.phone)}</span>`
}

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
]
