# SPEC — Mensagem de conta inativa no login

**Data:** 2026-07-03
**Etapa:** preparação pra tela de admin (roadmap `docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Pré-requisito:** Spec `2026-07-03-is-active-profiles.md` aplicada — `handleUser` em `useAuth.tsx` já precisa ter a checagem de `profiles.is_active`.
**Arquivos afetados:** `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`
**Não tocar em:** `src/pages/AuthCallback.tsx` (não existe mais), fluxo de admin (ainda não criado).
**Modelo:** Sonnet 4.6 High
**Paralelismo:** Task 2 depende da Task 1 (usa o novo `authError` exposto por `useAuth`).

---

## Contexto

Hoje, quando `handleUser` rejeita um login por `is_active = false` (ou por não ter `user_databases` ativo), ele só desloga silenciosamente — a tela de login não mostra nada, porque `signInWithPassword` já retornou sucesso (a senha estava certa, o problema é depois, na checagem de negócio). O usuário só vê o formulário voltar sem explicação. Esta spec adiciona uma mensagem visível nesses casos, pedindo pra falar com o admin.

---

## Task 1 — src/hooks/useAuth.tsx

**Arquivo:** `src/hooks/useAuth.tsx`
> Review: sim

Ler o arquivo real antes de editar. Adicionar `authError: string | null` à interface `AuthState` e ao estado do provider.

Dentro de `handleUser`, nos dois pontos onde hoje ele desloga silenciosamente (checagem de `is_active` e checagem de `user_databases`), definir uma mensagem antes do `signOut`:

```ts
if (!profile?.is_active) {
  await choreClient.auth.signOut()
  setUser(null)
  setAuthError('Sua conta está inativa. Entre em contato com o administrador.')
  setLoading(false)
  return
}

// ...

if (!db) {
  await choreClient.auth.signOut()
  setUser(null)
  setAuthError('Sua conta ainda não está configurada. Entre em contato com o administrador.')
  setLoading(false)
  return
}
```

No caminho de sucesso (usuário passa nas duas checagens), limpar o erro: `setAuthError(null)`.

Em `signInWithPassword`, limpar `authError` no início da chamada (antes de `choreClient.auth.signInWithPassword`) — pra não deixar uma mensagem antiga aparecendo numa tentativa nova.

Restrição: não alterar a lógica das checagens em si (só adicionar a mensagem antes do `signOut` que já existe).

---

## Task 2 — src/pages/Login.tsx

**Arquivo:** `src/pages/Login.tsx`
> Review: não

Pegar `authError` de `useAuth()` e exibir junto (ou no lugar) do `formError` já existente, mesmo estilo visual (`text-red-400 text-sm`):

```tsx
const { authError, /* ...resto que já usa... */ } = useAuth()
```

```tsx
{(formError || authError) && <p className="text-red-400 text-sm">{formError || authError}</p>}
```

Restrição: não duplicar a exibição — um só bloco de mensagem, priorizando `formError` (erro de credencial) sobre `authError` (erro de conta) se os dois existirem ao mesmo tempo por algum motivo.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `npx vitest run` — zero falhas
- [ ] Teste manual: `update profiles set is_active = false where email = '...'` num usuário de teste, tentar logar, confirmar que a mensagem aparece na tela (não só falha silenciosa)
- [ ] Reverter o teste manual (`is_active = true`) depois de confirmar
- [ ] `git commit -m "feat: mensagem de conta inativa no login"`
- [ ] `git push origin main`
