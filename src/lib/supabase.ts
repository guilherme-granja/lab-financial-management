import { createClient } from '@supabase/supabase-js'

import type { DatabaseConfig } from './database-config-resolver'

export function createSupabaseClient(config: DatabaseConfig) {
  return createClient(config.url, config.anonKey)
}
