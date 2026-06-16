-- Índice composto para detecção eficiente de duplicatas.
-- Cobre buscas por (type, amount, date, description) sem full scan.
-- Partial index: exclui linhas com description NULL pois dois NULLs não são duplicatas.
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check
  ON transactions (type, amount, date, description)
  WHERE description IS NOT NULL;
