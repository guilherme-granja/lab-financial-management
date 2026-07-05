-- RLS hardening: bancos pessoais (guilherme, malena, playwright/test)
-- Substitui "allow anon access" (using true) por "authenticated only" (auth.uid() is not null)
-- Isolamento entre usuarios continua no nivel de projeto Supabase; esta politica so bloqueia
-- acesso anonimo sem JWT caso a anon key vaze.

DROP POLICY IF EXISTS "allow anon access" ON public.categories;
CREATE POLICY "authenticated only" ON public.categories FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.goals;
CREATE POLICY "authenticated only" ON public.goals FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.transaction_payments;
CREATE POLICY "authenticated only" ON public.transaction_payments FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.accounts;
CREATE POLICY "authenticated only" ON public.accounts FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.transactions;
CREATE POLICY "authenticated only" ON public.transactions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.tags;
CREATE POLICY "authenticated only" ON public.tags FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.transaction_types;
CREATE POLICY "authenticated only" ON public.transaction_types FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.transaction_tags;
CREATE POLICY "authenticated only" ON public.transaction_tags FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow anon access" ON public.recurrence_groups;
CREATE POLICY "authenticated only" ON public.recurrence_groups FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
