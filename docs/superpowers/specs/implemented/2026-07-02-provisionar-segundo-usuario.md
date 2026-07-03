# SPEC — Provisionar segundo usuário (Malena)

**Data:** 2026-07-02
**Etapa:** 4 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Pré-requisito:** Spec 4.B aplicada e em produção (sem login por e-mail/senha, este usuário não consegue acessar mesmo com os dados corretos). Spec 4.A concluída (baseline do schema confirmado — já estava satisfeito, sem migration nova).
**Arquivos afetados:** Nenhum no repositório do app — esta spec só mexe no banco de dados pessoal do novo usuário (`upvkgppwkmijqmqrvcwl`) e no banco chore (`skfhscsbjeoogfeelirb`).
**Não tocar em:** o link do `supabase/` com o projeto principal (`cutjwwnwfyfidkxqgjdk`) — não rodar `supabase link` nesta spec, usar `--db-url` pra não sobrescrever esse link.
**Modelo:** Sonnet padrão (comandos CLI + SQL, sem decisão de arquitetura nova)
**Paralelismo:** Sequencial — Task 2 e 3 dependem da Task 1 (schema precisa existir antes de cadastrar a config apontando pra ele).

---

## Contexto

Segundo usuário da plataforma: **Malena**, e-mail `malenagranja@proton.me`, banco Supabase próprio já criado em outra conta (`upvkgppwkmijqmqrvcwl`). Como o schema do banco principal já está completo em `supabase/migrations/` (confirmado na Spec 4.A), provisionar o banco dela é só replicar essas migrations. Login dela é por e-mail/senha (sem GitHub OAuth), criado manualmente por você no chore — sem fluxo de self-signup.

---

## Task 1 — Aplicar as migrations no banco da Malena

> Review: sim

```bash
supabase db push --workdir supabase --db-url "postgresql://postgres:<SENHA_DO_BANCO>@db.upvkgppwkmijqmqrvcwl.supabase.co:5432/postgres"
```

A senha do banco fica em Project Settings → Database → Database password no dashboard do projeto `upvkgppwkmijqmqrvcwl` (resetar se não souber qual é). **Não** rodar `supabase link --project-ref upvkgppwkmijqmqrvcwl` — isso trocaria o link atual do `supabase/` (que aponta pro projeto principal) para o dela. O `--db-url` aplica direto, sem tocar em nenhum estado de link local.

Depois de rodar, conferir que as tabelas existem (via SQL Editor do projeto dela, ou `Supabase:list_tables` se o MCP tiver acesso a essa conta).

---

## Task 2 — Criar o usuário no Auth do chore

> Review: não (ação de dashboard, sem código)

Dashboard do `skfhscsbjeoogfeelirb` → Authentication → Users → **Add user**:
- Email: `malenagranja@proton.me`
- Password: definir uma senha temporária — combinar com ela por fora do chat/repositório, nunca deixar registrado em texto no código ou em specs
- Auto Confirm User: marcar como confirmado (senão ela precisaria confirmar por e-mail antes do primeiro login, e não configuramos envio de e-mail pro chore ainda)

---

## Task 3 — Cadastrar profiles e user_databases no chore

> Review: sim

SQL Editor do `skfhscsbjeoogfeelirb`:

```sql
insert into public.profiles (id, email, name)
select id, email, 'Malena'
from auth.users
where email = 'malenagranja@proton.me';

insert into public.user_databases (user_id, supabase_url, supabase_anon_key, supabase_project_ref, status)
values (
  (select id from auth.users where email = 'malenagranja@proton.me'),
  'https://upvkgppwkmijqmqrvcwl.supabase.co',
  'sb_publishable_L5dniDxAgevDu5fkY1mlcQ_ouMzRis7',
  'upvkgppwkmijqmqrvcwl',
  'active'
);
```

Rodar só depois que a Task 2 já tiver criado o `auth.users` — senão os `select ... where email = ...` não retornam nada e os inserts falham silenciosamente (0 linhas).

---

## Checklist

- [x] Task 1 concluída — schema replicado em `upvkgppwkmijqmqrvcwl` (9 tabelas, RLS habilitado em todas, 38 categorias + 3 transaction_types de seed, 0 transactions)
- [x] Task 2 concluída — usuário criado no Auth do chore, confirmado (feito manualmente pelo usuário via dashboard)
- [x] Task 3 concluída — `profiles` e `user_databases` com a linha da Malena (verificado via SELECT join, status active)
- [ ] Ela loga com e-mail/senha e cai num dashboard vazio (banco novo, sem nenhuma transação sua aparecendo — se aparecer dado seu, algo está errado no isolamento) — pendente, teste manual do usuário
- [ ] Passar a senha temporária pra ela por um canal seguro (não pelo chat, não commitado em lugar nenhum) — pendente, ação do usuário

## Nota de execução (2026-07-03)

Tasks 1 e 3 rodadas via MCP direto nos projetos `supabase-client-malena` e `supabase-chore` (conectados nesta sessão), em vez de `supabase db push --db-url`/SQL Editor manual — mesmo resultado, caminho mais confiável que CLI local (que falhou por auth na connection string direta; provavelmente projeto exige pooler). Task 2 feita manualmente pelo usuário no dashboard, como a própria spec já previa (sem código, sem MCP).

Dois itens do checklist ficam pendentes de verificação humana (login real da Malena, entrega da senha por canal seguro) — não bloqueiam mover a spec pra implemented, já que o provisionamento técnico (schema + auth + registro no chore) está completo e verificado.
