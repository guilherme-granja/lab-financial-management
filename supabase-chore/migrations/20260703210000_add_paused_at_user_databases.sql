ALTER TABLE user_databases
  ADD COLUMN IF NOT EXISTS paused_at timestamptz DEFAULT NULL;

-- 'paused' already valid: user_databases_status_check constraint already includes it.
