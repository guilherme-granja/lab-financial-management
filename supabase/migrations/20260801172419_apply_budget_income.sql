-- Flag em receitas: define se a transação entra na Base de cálculo do Orçamento.
-- Nasce true — maioria das receitas conta; exceções são desmarcadas manualmente.
ALTER TABLE transactions
  ADD COLUMN apply_budget boolean NOT NULL DEFAULT true;
