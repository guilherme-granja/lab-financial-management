-- Reverte RLS hardening (spec 6.1).
-- Arquitetura multi-tenant isola por projeto Supabase — auth.uid() é null em clientes
-- anônimos usados nos bancos pessoais, então "authenticated only" quebra todas as queries.
-- O isolamento real é garantido pela separação de projetos Supabase por usuário.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'accounts','categories','goals','recurrence_groups','tags',
    'transaction_payments','transaction_tags','transaction_types','transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated only" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "allow anon access" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "allow anon access" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
