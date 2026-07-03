# SPEC — Corrigir RLS que bloqueia dados nos bancos pessoais

**Data:** 2026-07-03
**Etapa:** 4 do roadmap multi-tenant (correção de regressão introduzida na Etapa 3)
**Arquivos afetados:** `supabase/migrations/<timestamp>_relax_rls_multitenant.sql` (novo)
**Não tocar em:** qualquer tabela do chore (`profiles`, `user_databases`) — lá a policy `auth.uid() = id`/`auth.uid() = user_id` continua correta, porque autenticação de verdade acontece no chore. Esta spec é só sobre os bancos pessoais (dados financeiros).
**Modelo:** Sonnet 4.6 High (decisão de segurança/RLS)
**Paralelismo:** Task 2 e Task 3 podem rodar em paralelo depois da Task 1 (bancos diferentes, sem dependência entre si).

---

## Contexto

Todas as tabelas do schema financeiro (`accounts`, `categories`, `goals`, `recurrence_groups`, `tags`, `transaction_payments`, `transaction_tags`, `transaction_types`, `transactions`) têm policies do tipo `auth.uid() IS NOT NULL` ou `auth.role() = 'authenticated'` — herdadas de quando autenticação e dados viviam no mesmo projeto Supabase. Depois da Etapa 3, a app nunca mais autentica contra o banco pessoal do usuário — só usa a anon/publishable key diretamente, sem sessão. RLS bloqueia tudo, sem erro visível, só retornando zero linhas.

Correção: relaxar essas policies pra permitir acesso via a própria anon key, sem exigir `auth.uid()`. Isso é seguro neste modelo porque isolamento agora é por projeto — cada projeto pessoal só é acessível por quem tem a anon key daquele projeto específico, guardada em `chore.user_databases` e protegida por RLS lá (`auth.uid() = user_id`, essa sim válida porque é consultada com sessão real do chore).

---

## Task 1 — Migration de relaxamento das policies

**Arquivo:** `supabase/migrations/<YYYYMMDDHHMMSS>_relax_rls_multitenant.sql`
> Review: sim

```sql
drop policy "auth only" on public.accounts;
create policy "allow anon access" on public.accounts for all using (true) with check (true);

drop policy "auth only" on public.categories;
create policy "allow anon access" on public.categories for all using (true) with check (true);

drop policy "auth only" on public.goals;
create policy "allow anon access" on public.goals for all using (true) with check (true);

drop policy "auth only" on public.recurrence_groups;
create policy "allow anon access" on public.recurrence_groups for all using (true) with check (true);

drop policy "Authenticated users can manage tags" on public.tags;
create policy "allow anon access" on public.tags for all using (true) with check (true);

drop policy "auth only" on public.transaction_payments;
create policy "allow anon access" on public.transaction_payments for all using (true) with check (true);

drop policy "auth only" on public.transaction_tags;
create policy "allow anon access" on public.transaction_tags for all using (true) with check (true);

drop policy "auth only" on public.transaction_types;
create policy "allow anon access" on public.transaction_types for all using (true) with check (true);

drop policy "auth only" on public.transactions;
create policy "allow anon access" on public.transactions for all using (true) with check (true);
```

Restrição: manter RLS **habilitado** nas tabelas (não fazer `disable row level security`) — só trocar a policy, mantendo a camada de RLS como estrutura, já preparada caso um dia haja motivo real para políticas mais granulares.

Aplicar no banco principal:
```bash
supabase db push --workdir supabase
```
(já linkado, não precisa de `--db-url` aqui).

---

## Task 2 — Aplicar no banco da Malena

> Review: não

```bash
supabase db push --workdir supabase --db-url "<connection string do upvkgppwkmijqmqrvcwl, mesmo padrão da Spec 4.C>"
```

---

## Task 3 — Verificação

> Review: sim

Em cada um dos dois bancos, confirmar que as policies novas existem:
```sql
select tablename, policyname, qual from pg_policies where schemaname = 'public';
```
Esperado: todas as 9 tabelas com policy `allow anon access` e `qual = true`, nenhuma mais com `auth.uid() IS NOT NULL`.

---

## Checklist

- [ ] Task 1 concluída — migration criada e aplicada no banco principal
- [ ] Task 2 concluída — mesma migration aplicada no banco da Malena
- [ ] Task 3 concluída — policies confirmadas nos dois bancos
- [ ] Login do Guilherme mostra as transações/contas reais de novo
- [ ] Login da Malena consegue criar uma transação de teste e ela persiste
- [ ] `git commit -m "fix: relaxa RLS dos bancos pessoais para modelo multi-tenant (etapa 4.E)"`
- [ ] `git push origin main`
