ALTER TABLE accounts
  ADD COLUMN initial_balance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE transactions
  DROP CONSTRAINT transactions_account_id_fkey,
  ADD CONSTRAINT transactions_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE transactions
  DROP CONSTRAINT transactions_to_account_id_fkey,
  ADD CONSTRAINT transactions_to_account_id_fkey
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
