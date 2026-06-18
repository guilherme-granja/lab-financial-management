-- =============================================================
-- FASE 1A: Tabela transaction_types
-- =============================================================

CREATE TABLE transaction_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  label         text NOT NULL,
  icon          text NOT NULL DEFAULT '💰',
  affects_balance boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_types FOR ALL USING (auth.uid() IS NOT NULL);

-- Seed dos 3 tipos existentes
INSERT INTO transaction_types (slug, label, icon, affects_balance) VALUES
  ('income',   'Receita',    '⬆️', true),
  ('expense',  'Despesa',    '⬇️', true),
  ('transfer', 'Transferência', '↔️', false);

-- FK em transactions apontando para transaction_types (nullable durante coexistência)
ALTER TABLE transactions
  ADD COLUMN type_id uuid REFERENCES transaction_types(id) ON DELETE RESTRICT;

-- Preencher type_id a partir do slug existente em `type`
UPDATE transactions t
SET type_id = tt.id
FROM transaction_types tt
WHERE tt.slug = t.type;

-- Índice para queries por type_id
CREATE INDEX idx_transactions_type_id ON transactions(type_id);

-- =============================================================
-- FASE 1B: Tabela transaction_tags (pivot N:N)
-- =============================================================

CREATE TABLE transaction_tags (
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id         uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, tag_id)
);

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_tags FOR ALL USING (auth.uid() IS NOT NULL);

-- Migrar dados existentes: tag_id direto → pivot
INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT id, tag_id
FROM transactions
WHERE tag_id IS NOT NULL;

-- Índice para lookup inverso (quais transações têm uma tag)
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);

-- NOTA: as colunas `type` (text) e `tag_id` (uuid) são mantidas em transactions
-- para compatibilidade com o app atual. Serão removidas na Fase 3 ou em spec futura.
-- Não adicionar NOT NULL em type_id nem dropar tag_id aqui.
