-- Remove classificação da categoria — conceito migrado para a transação
ALTER TABLE categories DROP COLUMN IF EXISTS budget_bucket;

-- Adiciona classificação na transação
-- Nullable no banco: histórico fica sem classificação (sem backfill).
-- Obrigatoriedade de preenchimento em despesas novas é responsabilidade da aplicação, não do banco.
ALTER TABLE transactions
  ADD COLUMN budget_bucket text
  CHECK (budget_bucket IN ('needs', 'leisure'));
