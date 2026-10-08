// Shared server-side helpers. Files in api/ starting with "_" are not
// exposed as endpoints by Vercel.
import { createClient } from '@supabase/supabase-js'

let adminClient = null

// Service role key bypasses RLS - only ever used server-side, never in the browser
export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  }
  return adminClient
}

// Re-prices a cart from the products table, ignoring any client-sent prices.
// Returns { items: [{ id, quantity, price_inr }], totalInr } or throws.
export async function priceCart(cart) {
  if (!Array.isArray(cart) || cart.length === 0) throw new Error('Cart is empty')

  const quantities = new Map()
  for (const item of cart) {
    const qty = Math.floor(Number(item?.quantity))
    if (!item?.id || !Number.isFinite(qty) || qty < 1 || qty > 100) throw new Error('Invalid cart item')
    quantities.set(item.id, (quantities.get(item.id) || 0) + qty)
  }

  const { data: products, error } = await getSupabaseAdmin()
    .from('products')
    .select('id, price_inr')
    .in('id', [...quantities.keys()])
  if (error) throw error
  if (products.length !== quantities.size) throw new Error('Some items in your cart are no longer available')

  const items = products.map((p) => ({ id: p.id, quantity: quantities.get(p.id), price_inr: p.price_inr }))
  const totalInr = items.reduce((sum, i) => sum + i.price_inr * i.quantity, 0)
  return { items, totalInr }
}

// Who is calling? Reads the Supabase access token the browser sends as
// "Authorization: Bearer <token>". Returns the user or null.
export async function getUserFromRequest(req) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  return error ? null : data.user
}

// Loads one of this user's saved addresses as a plain snapshot to store on the order
export async function getAddressSnapshot(addressId, userId) {
  if (!addressId || !userId) return null
  const { data, error } = await getSupabaseAdmin()
    .from('addresses')
    .select('full_name, phone, line1, line2, landmark, city, state, pincode, lat, lng')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
