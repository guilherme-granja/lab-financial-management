# SPEC — Baseline do schema do banco principal

**Data:** 2026-07-02
**Etapa:** 4 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `supabase/migrations/<timestamp>_remote_schema.sql` (novo, gerado pelo `supabase db pull`)
**Não tocar em:** qualquer arquivo em `src/`, `supabase-chore/` — esta spec é só sobre o banco principal (`cutjwwnwfyfidkxqgjdk`), sem relação com chore ou frontend.
**Modelo:** Sonnet padrão
**Paralelismo:** Nenhum — task única.
**Pré-requisito de ambiente:** Docker Desktop (ou daemon Docker) rodando localmente — `supabase db pull` sobe um Postgres local pra fazer o diff contra o schema remoto.

---

## Contexto

`supabase/migrations/` hoje só cobre a migration de contas/transferências/recorrência (`20260615200000_accounts_and_transfers.sql`) — a base (categories, transactions original, goals, RLS, seed) foi criada direto no dashboard do Supabase antes de existir controle de migration no repo, e nunca foi capturada como SQL. Isso significa que, hoje, aplicar `supabase/migrations/*.sql` do zero num banco vazio **não reproduz** o banco real.

Isso é bloqueante pra qualquer provisionamento de usuário novo (este e os futuros) — sem uma migration completa, não tem como replicar o schema. Esta spec resolve isso capturando o estado atual do banco principal como uma migration nova, tornando `supabase/migrations/` inteiro a fonte da verdade replicável a partir de agora.

---

## Task 1 — Capturar o schema remoto como migration

**Arquivo:** `supabase/migrations/<timestamp>_remote_schema.sql` (nome gerado automaticamente pelo comando)
> Review: sim

```bash
supabase db pull --workdir supabase
```

O `supabase/` já está linkado ao projeto principal (`cutjwwnwfyfidkxqgjdk`) desde o setup inicial — não precisa rodar `supabase link` de novo.

Depois de rodar, **ler o arquivo de migration gerado por completo antes de commitar** — confirmar que ele contém:
- As tabelas `categories`, `transactions`, `goals` (schema original, pré-junho de contas)
- Todas as políticas RLS existentes nessas tabelas
- Qualquer seed de categorias, se estiver representado como dado versionável (o `db pull` captura schema, não necessariamente dados — se o seed de categorias for dado de linha, não schema, ele **não** vai aparecer aqui; isso é esperado, dado não é responsabilidade de migration de schema)

Se o comando falhar por falta de Docker, parar e avisar — não tentar contornar rodando `db push` direto sem antes ter o diff local pra conferir.

Restrição: não editar manualmente o SQL gerado além de formatação/comentários — se algo parecer errado ou incompleto, reportar em vez de "consertar" às cegas, porque um erro aqui compromete a reprodutibilidade de qualquer usuário futuro.

---

## Checklist

- [x] `supabase db pull --workdir supabase` executado com sucesso — resultado: **"No schema changes found"**
- [x] Migration já existente revisada por completo — `supabase/migrations/20260615150122_remote_schema.sql` já contém `categories`, `transactions`, `goals`, RLS habilitado nas três e 3 policies correspondentes
- [x] Nenhuma edição manual no SQL além de formatação — nenhuma edição necessária, nada foi gerado
- [ ] ~~`git commit`~~ — não aplicável, nenhuma mudança de código
- [ ] ~~`git push origin main`~~ — não aplicável, nenhuma mudança de código
- [x] Confirmado: `supabase/migrations/` já é a fonte da verdade completa (baseline pré-existente desde 2026-06-15, não capturada por esta spec) — liberado para Spec 4.C

## Nota de execução (2026-07-02)

Premissa da spec estava desatualizada: o baseline (`categories`, `transactions`, `goals`, RLS, policies) já havia sido capturado em `20260615150122_remote_schema.sql`, antes desta spec ser escrita. `supabase db pull` confirmou zero diff contra o banco remoto (`cutjwwnwfyfidkxqgjdk`). Nenhum arquivo novo gerado, nenhum commit necessário — spec encerrada como já satisfeita pelo estado existente do repositório.
