// Pinned exact version: cached by the browser/CDN for a year, no version lookup per visit
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm'

// These are safe to expose in client-side code — the anon key only ever
// grants what your Row Level Security policies allow (see sql/schema.sql).
// Get both values from: Supabase dashboard → Project Settings → API
const SUPABASE_URL = 'https://kvlqqsvyrspxbumoadxn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bHFxc3Z5cnNweGJ1bW9hZHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMDU2MjUsImV4cCI6MjEwMTU4MTYyNX0.niJjZEoalZBJvbRaQavaoEwir0wmuMzCn0xeWs8x7fQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
