# SPEC — Schema inicial do banco chore

**Data:** 2026-07-02
**Etapa:** 2 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `supabase-chore/config.toml` (novo), `supabase-chore/.gitignore` (novo), `supabase-chore/migrations/<timestamp>_create_chore_schema.sql` (novo)
**Não tocar em:** `supabase/` (pasta do banco principal do app, projeto `cutjwwnwfyfidkxqgjdk` — continua intocada e linkada como sempre), qualquer arquivo em `src/` — esta spec não muda nada do frontend, só cria o schema no banco chore.
**Modelo:** Sonnet 4.6 High
**Paralelismo:** Nenhum — task única, sequencial.

---

## Contexto

O banco chore (projeto Supabase `skfhscsbjeoogfeelirb`, organização "Lab Chore") já foi criado no dashboard, mas está vazio. Em vez de aplicar SQL solto via SQL Editor, esta spec versiona o schema como migration, numa pasta `supabase-chore/` paralela à `supabase/` já existente — o CLI do Supabase suporta múltiplos projetos no mesmo repositório via `--workdir`/`SUPABASE_WORKDIR`, sem precisar trocar o link do projeto principal.

**Decisões de arquitetura desta etapa** (herdadas do plano, confirme antes de aplicar se algo aqui não bater com o combinado):
- Autenticação centralizada no chore: `profiles` estende `auth.users` do próprio projeto chore (1:1).
- `user_databases` guarda a config de conexão do banco pessoal de cada usuário — só leitura para o próprio usuário via RLS; nenhuma escrita client-side (provisionar é sempre ação administrativa, via SQL Editor ou service role).
- Nenhum trigger de auto-criação de `profiles` nesta etapa — cadastro de usuário ainda é manual/administrativo, isso é decisão da Etapa 4.

---

## Task 1 — Inicializar supabase-chore/ e criar o schema

**Arquivo:** `supabase-chore/migrations/<YYYYMMDDHHMMSS>_create_chore_schema.sql`
> Review: sim

**Passo 1 — inicializar a pasta:**
```bash
supabase init --workdir supabase-chore
```
Isso cria `supabase-chore/config.toml` e `supabase-chore/.gitignore` com o boilerplate padrão do CLI.

**Passo 2 — ajustar `supabase-chore/config.toml`:**
Trocar o campo `project_id` (topo do arquivo) de `"supabase-chore"` (ou o que o CLI gerar por padrão) para `"lab-financial-management-chore"` — evita conflito de nome com a pasta `supabase/` já existente caso as duas rodem localmente ao mesmo tempo algum dia. Não alterar mais nada no arquivo gerado.

**Passo 3 — conferir `supabase-chore/.gitignore`:**
Deve conter, no mínimo, o mesmo conteúdo de `supabase/.gitignore`:
```
.branches
.temp
```
Se o `supabase init` já gerar isso, só confirmar — não precisa reescrever.

**Passo 4 — linkar ao projeto remoto:**
```bash
supabase link --project-ref skfhscsbjeoogfeelirb --workdir supabase-chore
```
Vai pedir a senha do banco Postgres do projeto chore (disponível em Project Settings → Database no dashboard do Supabase).

**Passo 5 — criar a migration:**
```sql
-- Extensão necessária para gen_random_uuid()
create extension if not exists pgcrypto;

-- Perfil de cada usuário da plataforma, 1:1 com auth.users do projeto chore
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios veem o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios atualizam o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Configuracao do banco de dados pessoal de cada usuario
create table public.user_databases (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references public.profiles(id) on delete cascade,
  supabase_url          text not null,
  supabase_anon_key     text not null,
  supabase_project_ref  text,
  status                text not null default 'active' check (status in ('provisioning', 'active', 'paused', 'error')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_databases enable row level security;

create policy "Usuarios veem a propria configuracao de banco"
  on public.user_databases for select
  using (auth.uid() = user_id);

-- Nenhuma policy de insert/update/delete para o role authenticated:
-- provisionar banco de usuario e sempre uma acao administrativa,
-- feita via SQL Editor ou service role -- nunca pelo client autenticado.
```

**Passo 6 — aplicar:**
```bash
supabase db push --workdir supabase-chore
```

**Passo 7 — checagem de segurança:**
Rodar `Supabase:get_advisors` (type: security) contra o projeto `skfhscsbjeoogfeelirb` e revisar qualquer alerta antes de considerar a task concluída — em especial confirmar que RLS está habilitado nas duas tabelas (já deveria estar, pelo `alter table ... enable row level security` acima, mas vale conferir que o advisor não aponta nada extra).

Restrições: não criar nenhuma policy de insert/update/delete em `user_databases` além do que está no SQL acima — a ausência delas é intencional. Não criar trigger em `auth.users`. Não popular nenhuma linha ainda (nem seed, nem dado de teste) — isso é o primeiro passo da Etapa 3, depois que o login contra o chore existir de verdade.

---

## Checklist

- [x] `supabase-chore/` inicializado e linkado ao projeto `skfhscsbjeoogfeelirb`
- [x] Migration criada e aplicada (`supabase db push --workdir supabase-chore` sem erros)
- [x] Tabelas `profiles` e `user_databases` existem, RLS habilitado nas duas
- [x] Nenhuma policy de escrita em `user_databases`
- [x] `Supabase:get_advisors` (security) revisado, sem alertas críticos pendentes (verificado manualmente no dashboard — MCP não tinha permissão neste projeto)
- [x] `git commit -m "feat: schema inicial do banco chore (etapa 2)"`
- [x] `git push origin main` — seguro aqui, essa mudança não afeta o app em produção nem a suíte de testes do frontend

**Nota:** estrutura real ficou `supabase-chore/supabase/config.toml` (aninhada), não `supabase-chore/config.toml` (plana) como o cabeçalho da spec previa — `--workdir` do CLI cria subpasta `supabase/` dentro do workdir informado.
