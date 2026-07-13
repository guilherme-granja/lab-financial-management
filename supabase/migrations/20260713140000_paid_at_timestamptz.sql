ALTER TABLE transactions
  ALTER COLUMN paid_at TYPE timestamptz
  USING (paid_at::timestamp AT TIME ZONE 'America/Sao_Paulo');
