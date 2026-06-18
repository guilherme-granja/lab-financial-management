-- =============================================================
-- FASE 3: Tabela transaction_payments
-- =============================================================

CREATE TABLE transaction_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  paid_at        date NOT NULL,
  paid_amount    numeric(12,2) NOT NULL CHECK (paid_amount > 0),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_payments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_transaction_payments_transaction_id ON transaction_payments(transaction_id);

-- Migrar os 96 registros com paid_at preenchido
INSERT INTO transaction_payments (transaction_id, paid_at, paid_amount)
SELECT id, paid_at, paid_amount
FROM transactions
WHERE paid_at IS NOT NULL
  AND paid_amount IS NOT NULL;

-- Trigger para manter `paid` boolean sincronizado automaticamente
CREATE OR REPLACE FUNCTION sync_transaction_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE transactions SET paid = true WHERE id = NEW.transaction_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE transactions SET paid = false WHERE id = OLD.transaction_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_transaction_paid
AFTER INSERT OR DELETE ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION sync_transaction_paid();

-- Verificação de sanidade: paid deve ser true onde há payment
-- (os 96 registros já devem ter paid=true; trigger cuida do futuro)
UPDATE transactions t
SET paid = true
WHERE EXISTS (
  SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = t.id
)
AND paid = false;

-- NOTA: colunas `paid_at` e `paid_amount` são mantidas em transactions
-- para rollback de emergência. Não dropar nesta fase.
-- A coluna `paid boolean` é mantida permanentemente como cache de filtro.
