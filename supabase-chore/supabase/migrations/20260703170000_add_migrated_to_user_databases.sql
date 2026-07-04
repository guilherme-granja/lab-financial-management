ALTER TABLE user_databases
  ADD COLUMN IF NOT EXISTS migrated boolean NOT NULL DEFAULT false;
