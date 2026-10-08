import { supabase } from './supabaseClient.js'

const BUCKET = 'site-images'
const MAX_BYTES = 5 * 1024 * 1024

// Uploads an image to Supabase Storage (admin only, enforced by Storage
// policies in sql/stats-and-images.sql) and returns its public URL.
export async function uploadImage(file, folder) {
  if (!file) throw new Error('No file selected')
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  if (file.size > MAX_BYTES) throw new Error('Image is larger than 5 MB — please use a smaller file')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
  })
  if (error) throw error

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
