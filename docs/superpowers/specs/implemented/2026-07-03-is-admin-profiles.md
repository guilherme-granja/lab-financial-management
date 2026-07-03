# SPEC — Adicionar perfil de admin ao banco chore

**Data:** 2026-07-03
**Etapa:** preparação pra tela de admin (roadmap `docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `supabase-chore/migrations/<timestamp>_add_is_admin_to_profiles.sql` (novo)
**Não tocar em:** `supabase/` (banco principal), `supabase-chore/migrations/` já existentes — só adicionar um arquivo novo, não editar os anteriores.
**Modelo:** Sonnet padrão
**Paralelismo:** Nenhum — task única.

---

## Contexto

A tela de admin (`/admin/login`) só pode ser acessada por usuários marcados como admin no chore. Falta a coluna que guarda essa marcação em `profiles`. Esta spec só adiciona a coluna — a policy de RLS para admins gerenciarem outros usuários (ler/criar `profiles`/`user_databases` de terceiros) fica pra quando a spec da tela de admin em si for escrita, depois que o mock definir exatamente o que a tela precisa fazer.

---

## Task 1 — Coluna is_admin

**Arquivo:** `supabase-chore/migrations/<YYYYMMDDHHMMSS>_add_is_admin_to_profiles.sql`
> Review: sim

```sql
alter table public.profiles
  add column is_admin boolean not null default false;
```

Aplicar com:
```bash
supabase db push --workdir supabase-chore
```

Restrição: não criar policy de RLS nova nesta task — isso é da spec da tela de admin, ainda não escrita.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Migration aplicada no chore (`skfhscsbjeoogfeelirb`)
- [ ] Confirmar coluna existe: `select column_name from information_schema.columns where table_name = 'profiles';` inclui `is_admin`
- [ ] `git commit -m "feat: adiciona is_admin em profiles (preparacao tela admin)"`
- [ ] `git push origin main`
