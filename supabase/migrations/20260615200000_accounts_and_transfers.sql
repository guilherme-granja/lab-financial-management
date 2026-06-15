-- Tabela de contas
CREATE TABLE accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  type                 text NOT NULL CHECK (type IN ('checking','savings','cash','credit','investment','other')),
  color                text NOT NULL DEFAULT '#6366f1',
  icon                 text NOT NULL DEFAULT '🏦',
  include_in_dashboard boolean NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

-- Vincular transações a contas
ALTER TABLE transactions
  ADD COLUMN account_id    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Novo tipo: transfer
ALTER TABLE transactions
  DROP CONSTRAINT transactions_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income','expense','transfer'));

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON accounts FOR ALL USING (auth.uid() IS NOT NULL);

-- Recorrência e pagamento
ALTER TABLE transactions
  ADD COLUMN recurrence        text NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','installment','fixed')),
  ADD COLUMN installments      integer CHECK (installments > 0),
  ADD COLUMN installment_index integer,
  ADD COLUMN recurrence_group_id uuid,
  ADD COLUMN paid              boolean NOT NULL DEFAULT true,
  ADD COLUMN paid_at           date,
  ADD COLUMN paid_amount       numeric(12,2);
