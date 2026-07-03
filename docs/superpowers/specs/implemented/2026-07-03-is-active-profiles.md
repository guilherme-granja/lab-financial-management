# SPEC — Conceito de usuário ativo/inativo (is_active)

**Data:** 2026-07-03
**Etapa:** preparação pra tela de admin (roadmap `docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `supabase-chore/migrations/<timestamp>_add_is_active_to_profiles.sql` (novo), `src/hooks/useAuth.tsx`
**Não tocar em:** `user_databases` (o `status` dessa tabela continua sendo sobre a saúde da conexão do banco, não sobre a conta), UI de admin (ainda não existe — o toggle em si fica pra depois, esta spec só cria e aplica o campo).
**Modelo:** Sonnet 4.6 High (mexe no gate de autenticação, precisa cuidado)
**Paralelismo:** Task 2 depende da Task 1 (coluna precisa existir antes do código consultar).

---

## Contexto

`is_admin` já foi adicionado a `profiles`. Agora falta `is_active` — um interruptor único que serve tanto pra usuários comuns quanto pro admin (que não tem linha em `user_databases`, então o `status` de lá não o alcançaria). Default `true` pra não deslogar ninguém que já está usando o app. O toggle na UI vem depois, junto da tela de admin — esta spec só garante que o campo existe e que o login já respeita ele.

---

## Task 1 — Coluna is_active

**Arquivo:** `supabase-chore/migrations/<YYYYMMDDHHMMSS>_add_is_active_to_profiles.sql`
> Review: sim

```sql
alter table public.profiles
  add column is_active boolean not null default true;
```

Aplicar com:
```bash
supabase db push --workdir supabase-chore
```

---

## Task 2 — Gate de login checa is_active

**Arquivo:** `src/hooks/useAuth.tsx`
> Review: sim

Ler o arquivo real antes de editar. Dentro de `handleUser`, antes (ou junto) da checagem existente de `user_databases`, adicionar uma checagem de `profiles.is_active`:

```ts
const { data: profile } = await choreClient
  .from('profiles')
  .select('is_active')
  .eq('id', u.id)
  .maybeSingle()

if (!profile?.is_active) {
  await choreClient.auth.signOut()
  setUser(null)
  setLoading(false)
  return
}
```

Se `profile` não existir ou `is_active` for `false`, desloga — mesmo padrão já usado na checagem de `user_databases` (early return, sem lançar erro visível além do estado deslogado). Manter a checagem de `user_databases` como está, na sequência — as duas precisam passar pro login do app principal funcionar.

Restrição: não criar um hook novo nem duplicar lógica — é um bloco a mais dentro do `handleUser` que já existe.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `npx vitest run` — zero falhas
- [ ] Testar manualmente: login continua funcionando normal (todo mundo tem `is_active = true` por default)
- [ ] Teste manual opcional: `update profiles set is_active = false where email = '...'` num usuário de teste, confirmar que o login passa a ser recusado
- [ ] `git commit -m "feat: adiciona conceito is_active em profiles, aplicado no gate de login"`
- [ ] `git push origin main`
