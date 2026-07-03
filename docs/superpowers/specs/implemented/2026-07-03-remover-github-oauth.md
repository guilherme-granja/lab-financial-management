# SPEC — Remover fluxo de GitHub OAuth (login só por senha)

**Data:** 2026-07-03
**Etapa:** limpeza pós Etapa 4 (roadmap `docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`, `src/router/index.tsx`
**Arquivo a deletar:** `src/pages/AuthCallback.tsx`
**Não tocar em:** `src/lib/chore-client.ts`, `src/hooks/useDatabase.tsx`, `src/lib/database-config-resolver.ts`, qualquer hook de dados — nada disso depende do método de login, só do resultado (usuário autenticado).
**Modelo:** Sonnet 4.6 High
**Paralelismo:** Task 1 e Task 3 (deletar AuthCallback) podem rodar em paralelo. Task 2 e Task 4 dependem de saber que a Task 1/3 removeram o caminho de GitHub, mas não têm dependência de output direta — só ordem lógica de leitura.

---

## Contexto

Ninguém usa mais GitHub OAuth desde que o login passou a ser por e-mail/senha, cadastrado manualmente no chore (Etapa 4). O caminho de código continua existindo mas está morto: `signInWithGithub` em `useAuth.tsx`, o botão correspondente em `Login.tsx`, e a página `AuthCallback.tsx` inteira (que só existia para tratar o redirect do OAuth). Esta spec remove tudo isso. Login volta a ter um único caminho: e-mail/senha.

Antes de editar, ler os arquivos reais — a implementação atual pode ter mudado desde a última indexação de conhecimento do projeto (várias specs recentes mexeram nesses arquivos: 3.B, 4.B, 4.D).

---

## Task 1 — src/hooks/useAuth.tsx

**Arquivo:** `src/hooks/useAuth.tsx`
> Review: sim

Remover `signInWithGithub` da interface `AuthState` e da implementação (a chamada `choreClient.auth.signInWithOAuth({ provider: 'github', ... })` e tudo relacionado). A interface pública fica: `{ user, loading, signInWithPassword, signOut }`.

Restrição: não mexer em `handleUser`/checagem de `user_databases`, `signInWithPassword` nem `signOut` — só remover o método de GitHub.

---

## Task 2 — src/pages/Login.tsx

**Arquivo:** `src/pages/Login.tsx`
> Review: sim

Remover o botão "Entrar com GitHub", o `<Separator>`/divisor "ou" que existia entre ele e o formulário de senha, e qualquer tratamento de `?error=unauthorized` via `useSearchParams` (esse parâmetro só era usado pelo redirect do `AuthCallback.tsx`, que deixa de existir). Erros de login continuam sendo mostrados inline via `formError`, como já é hoje pro fluxo de senha.

O formulário de e-mail/senha em si não muda.

---

## Task 3 — Deletar src/pages/AuthCallback.tsx

> Review: não

Remover o arquivo por completo — não tem mais nenhuma rota apontando pra ele depois da Task 4.

---

## Task 4 — src/router/index.tsx

**Arquivo:** `src/router/index.tsx`
> Review: não

Remover o import de `AuthCallback` e a rota `{ path: '/auth/callback', element: <AuthCallback /> }`. Nenhuma outra rota muda.

---

## Passo manual (fora do código)

Depois do deploy, desativar o provider no dashboard do chore: `skfhscsbjeoogfeelirb` → Authentication → Sign In / Providers → GitHub → desligar. Não bloqueia nada tecnicamente (o código não chama mais isso), mas evita deixar um provider ativo sem uso.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] Task 4 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `npx vitest run` — zero falhas
- [ ] Testar manualmente: login por e-mail/senha continua funcionando normalmente
- [ ] Desativar provider GitHub no dashboard do chore (passo manual acima)
- [ ] `git commit -m "chore: remove fluxo morto de GitHub OAuth, login so por senha"`
- [ ] `git push origin main`
