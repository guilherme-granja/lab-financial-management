-- monthly_budgets nasceu com policy "auth only" (auth.uid() IS NOT NULL),
-- que nunca é satisfeita nesta arquitetura (bancos pessoais por usuário,
-- acessados só com anon key, sem sessão JWT autenticada no projeto-alvo).
-- Todas as outras tabelas (accounts, categories, transactions) já usam
-- "allow anon access" USING (true) WITH CHECK (true) — alinhando aqui.
DROP POLICY IF EXISTS "auth only" ON monthly_budgets;

CREATE POLICY "allow anon access" ON monthly_budgets
  FOR ALL USING (true) WITH CHECK (true);
