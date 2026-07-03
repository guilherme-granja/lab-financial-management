import { createSupabaseClient } from './supabase'

export const choreClient = createSupabaseClient({
  url: import.meta.env.VITE_CHORE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_CHORE_SUPABASE_ANON_KEY,
})
