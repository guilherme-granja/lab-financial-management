-- Nova coluna nas categorias para classificação no orçamento
-- Apenas 'needs' (Contas) e 'leisure' (Lazer)
-- 'savings' (Guardar) é sempre calculado como residual — nunca atribuído a categorias
-- nullable: categorias existentes ficam null até o usuário classificar
ALTER TABLE categories
  ADD COLUMN budget_bucket text
  CHECK (budget_bucket IN ('needs', 'leisure'));

-- Tabela de orçamentos mensais
-- Um registro por mês; o usuário cria/substitui a cada mês
CREATE TABLE monthly_budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month        text NOT NULL,  -- formato 'YYYY-MM'
  preset       text CHECK (preset IN ('50_30_20', '60_30_10', '70_20_10', 'custom')),
  needs_pct    numeric(5,2) NOT NULL CHECK (needs_pct >= 0 AND needs_pct <= 100),
  leisure_pct  numeric(5,2) NOT NULL CHECK (leisure_pct >= 0 AND leisure_pct <= 100),
  savings_pct  numeric(5,2) NOT NULL CHECK (savings_pct >= 0 AND savings_pct <= 100),
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT monthly_budgets_pct_sum CHECK (
    ROUND(needs_pct + leisure_pct + savings_pct, 2) = 100
  ),
  CONSTRAINT monthly_budgets_month_unique UNIQUE (month)
);

ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON monthly_budgets FOR ALL USING (auth.uid() IS NOT NULL);
