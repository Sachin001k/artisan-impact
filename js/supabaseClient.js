import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// These are safe to expose in client-side code — the anon key only ever
// grants what your Row Level Security policies allow (see sql/schema.sql).
// Get both values from: Supabase dashboard → Project Settings → API
const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL_HERE'
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
