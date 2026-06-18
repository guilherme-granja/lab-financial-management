-- =============================================================
-- FASE 2: Tabela recurrence_groups
-- =============================================================

CREATE TABLE recurrence_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_type     text NOT NULL CHECK (recurrence_type IN ('installment', 'fixed')),
  total_installments  integer NOT NULL CHECK (total_installments > 0),
  description_template text,
  starts_at           date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurrence_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON recurrence_groups FOR ALL USING (auth.uid() IS NOT NULL);

-- Migrar os 19 grupos existentes a partir dos dados em transactions.
-- Para cada grupo distinto, pega o valor do membro com installment_index = 1
-- (ou MIN se não houver índice 1) para reconstruir os metadados.
INSERT INTO recurrence_groups (id, recurrence_type, total_installments, description_template, starts_at)
SELECT
  recurrence_group_id                                         AS id,
  recurrence                                                  AS recurrence_type,
  COALESCE(MAX(installments), 1)                              AS total_installments,
  -- Remove sufixo " (N/M)" da description para obter o template limpo
  regexp_replace(
    (ARRAY_AGG(description ORDER BY installment_index ASC NULLS LAST))[1],
    ' \(\d+/\d+\)$', ''
  )                                                           AS description_template,
  MIN(date)                                                   AS starts_at
FROM transactions
WHERE recurrence_group_id IS NOT NULL
  AND recurrence != 'none'
GROUP BY recurrence_group_id, recurrence;

-- Transformar recurrence_group_id em FK real para recurrence_groups
-- (era uuid livre sem constraint)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_recurrence_group_id_fkey
  FOREIGN KEY (recurrence_group_id) REFERENCES recurrence_groups(id) ON DELETE CASCADE;

-- Índice para busca por grupo
CREATE INDEX idx_transactions_recurrence_group_id ON transactions(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- NOTA: as colunas redundantes (recurrence, installments, installment_index)
-- são mantidas em transactions nesta fase para compatibilidade com o app atual.
-- installment_index continua necessário para renderização do badge "X/N".
-- `recurrence` e `installments` serão deprecados mas não dropados nesta spec
-- — remoção na Fase 3 ou em spec dedicada após validação.
