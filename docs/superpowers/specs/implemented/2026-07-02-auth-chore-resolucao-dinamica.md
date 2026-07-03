# SPEC — Autenticação contra o chore e resolução dinâmica do banco do usuário

**Data:** 2026-07-02
**Etapa:** 3 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Pré-requisito:** Spec 3.A aplicada e commitada — precisa de `choreClient` existindo em `src/lib/chore-client.ts`.
**Arquivos afetados:** `src/hooks/useAuth.tsx`, `src/lib/database-config-resolver.ts`, `src/hooks/useDatabase.tsx`, `src/router/index.tsx`, `src/main.tsx`, `.env`, `.env.example`, `src/vite-env.d.ts`
**Não tocar em:** `src/hooks/useAccounts.ts`, `src/hooks/useTransactions.ts`, `src/hooks/useCategories.ts`, `src/hooks/useGoals.ts`, e todas as páginas — nenhum deles muda, todos continuam usando `useSupabaseClient()` exatamente como já usam; só o que alimenta o provider por trás muda.
**Modelo:** Sonnet 4.6 High
**Paralelismo:** Task 1 e Task 2 podem rodar em paralelo entre si (arquivos distintos, sem dependência direta). Task 3 depende da Task 2 (usa `ChoreDatabaseConfigResolver`). Task 4 depende da Task 3 (usa o novo comportamento do `DatabaseProvider`). Task 5 depende da Task 4 (só reflete a nova posição do provider no router).

---

## Contexto

Hoje o login roda contra o banco de dados pessoal de cada usuário (compartilhando client com os dados) e o gate de acesso é `user.email === VITE_ALLOWED_EMAIL`. A partir desta spec:

- Login passa a rodar contra o **chore**, via `choreClient` (fixo, criado na Spec 3.A).
- O gate de acesso deixa de ser um e-mail hardcoded e passa a ser: existe uma linha ativa em `chore.user_databases` pra esse usuário? Sem isso, nem GitHub OAuth bem-sucedido dá acesso.
- Depois do login, o `DatabaseProvider` (já existente desde a Etapa 1) passa a resolver a config do client de dados consultando `user_databases` no chore — não mais lendo do `.env`.
- Como o client de dados agora depende do usuário já estar autenticado, `DatabaseProvider` muda de lugar: sai do topo de `main.tsx` e vai pra dentro do `PrivateRoute`, garantindo que só é montado quando já existe um usuário logado no chore.

Fluxo resultante: `login (choreClient) → checagem de user_databases → DatabaseProvider monta → ChoreDatabaseConfigResolver busca a config → client de dados criado → app renderiza normalmente`.

---

## Task 1 — src/hooks/useAuth.tsx

**Arquivo:** `src/hooks/useAuth.tsx`
**Arquivos relacionados:** `.env`, `.env.example`, `src/vite-env.d.ts` (remoção de `VITE_ALLOWED_EMAIL`)
> Review: sim

Trocar `useSupabaseClient()` por `choreClient` (import de `@/lib/chore-client`) em todas as chamadas — `getSession`, `onAuthStateChange`, `signInWithOAuth`, `signOut`. `useAuth.tsx` não depende mais de estar dentro de `DatabaseProvider`.

Trocar o gate de e-mail por checagem de linha ativa em `user_databases`:

```ts
const handleUser = async (u: User | null) => {
  if (u) {
    const { data } = await choreClient
      .from('user_databases')
      .select('id')
      .eq('user_id', u.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!data) {
      await choreClient.auth.signOut()
      setUser(null)
      setLoading(false)
      return
    }
  }
  setUser(u)
  setLoading(false)
}
```

Remover `VITE_ALLOWED_EMAIL` de `.env`, `.env.example` e da `interface ImportMetaEnv` em `src/vite-env.d.ts` — não é mais referenciada em lugar nenhum depois desta task.

Restrição: manter a assinatura pública de `useAuth()` idêntica — `{ user, loading, signInWithGithub, signOut }`. Nenhum consumidor de `useAuth` deve precisar mudar.

---

## Task 2 — src/lib/database-config-resolver.ts

**Arquivo:** `src/lib/database-config-resolver.ts`
> Review: sim

Adicionar `ChoreDatabaseConfigResolver`, sem remover `EnvDatabaseConfigResolver` (fica no arquivo como referência/reuso em testes, mesmo não sendo mais instanciado em produção depois desta spec):

```ts
import { choreClient } from './chore-client'

export class ChoreDatabaseConfigResolver implements DatabaseConfigResolver {
  constructor(private userId: string) {}

  async getConfig(): Promise<DatabaseConfig> {
    const { data, error } = await choreClient
      .from('user_databases')
      .select('supabase_url, supabase_anon_key')
      .eq('user_id', this.userId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      throw new Error('Não foi possível carregar a configuração do banco do usuário.')
    }

    return { url: data.supabase_url, anonKey: data.supabase_anon_key }
  }
}
```

---

## Task 3 — src/hooks/useDatabase.tsx

**Arquivo:** `src/hooks/useDatabase.tsx`
> Review: sim

`DatabaseProvider` deixa de instanciar `new EnvDatabaseConfigResolver()` sem parâmetro. Passa a chamar `useAuth()` internamente para obter o `user` (garantido existir — ver Task 4, o provider só é montado dentro de `PrivateRoute`) e instanciar `new ChoreDatabaseConfigResolver(user.id)`. A tela de carregamento ("Carregando...") continua igual enquanto `getConfig()` resolve.

Restrição: `useSupabaseClient()` e `useDatabase()` continuam com a mesma assinatura pública de antes — nenhum hook de dados muda por causa desta task.

---

## Task 4 — src/router/index.tsx

**Arquivo:** `src/router/index.tsx`
> Review: sim

Mover `DatabaseProvider` (import de `@/hooks/useDatabase`) pra dentro de `PrivateRoute`, envolvendo só o `<Outlet />`:

```tsx
function PrivateRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    // ...como já está...
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <DatabaseProvider>
      <PageWrapper>
        <Outlet />
      </PageWrapper>
    </DatabaseProvider>
  )
}
```

Isso garante que `DatabaseProvider` só tenta resolver a config depois que já existe um usuário autenticado no chore — sem isso, `useAuth()` dentro dele quebraria.

---

## Task 5 — src/main.tsx

**Arquivo:** `src/main.tsx`
> Review: não

Remover o `<DatabaseProvider>` que envolvia a árvore inteira desde a Etapa 1 — volta a ser só:

```tsx
<AuthProvider>
  <RouterProvider router={router} />
</AuthProvider>
```

---

## Passos manuais pós-deploy (fora do escopo de código)

Esta spec por si só não é suficiente pra você conseguir logar — falta configuração de dashboard e um seed manual, nessa ordem:

1. **Habilitar GitHub OAuth no projeto chore**: dashboard do `skfhscsbjeoogfeelirb` → Authentication → Providers → GitHub. Pode reusar o mesmo GitHub OAuth App de hoje — só adicionar a nova callback URL do chore (`https://skfhscsbjeoogfeelirb.supabase.co/auth/v1/callback`) como Authorized redirect URI adicional no GitHub OAuth App, mantendo a atual.
2. **Aplicar esta spec e fazer deploy.**
3. **Tentar logar uma vez.** Vai autenticar com sucesso contra o GitHub, mas a checagem de `user_databases` vai falhar (ainda não existe linha pra você) e a Task 1 vai deslogar automaticamente — isso é esperado nesse primeiro passo, é só pra criar sua linha em `auth.users` do chore.
4. **Rodar no SQL Editor do projeto chore** (com seu e-mail correto no lugar):
   ```sql
   insert into public.profiles (id, email, name)
   select id, email, raw_user_meta_data->>'user_name'
   from auth.users
   where email = 'guilhermegranja.dev@gmail.com';

   insert into public.user_databases (user_id, supabase_url, supabase_anon_key, supabase_project_ref, status)
   values (
     (select id from auth.users where email = 'guilhermegranja.dev@gmail.com'),
     'https://cutjwwnwfyfidkxqgjdk.supabase.co',
     '<anon key do projeto principal, o mesmo que está em VITE_SUPABASE_ANON_KEY hoje>',
     'cutjwwnwfyfidkxqgjdk',
     'active'
   );
   ```
5. **Logar de novo.** Agora a checagem encontra a linha, o `DatabaseProvider` resolve a config apontando pro seu banco principal de sempre, e o app deve funcionar de ponta a ponta como sempre funcionou — só que passando pelo chore no meio.

---

## Checklist

- [x] Task 1 concluída
- [x] Task 2 concluída
- [x] Task 3 concluída
- [x] Task 4 concluída
- [x] Task 5 concluída
- [x] `tsc --noEmit` — zero erros
- [x] `npx vitest run` — 94 passando, nenhum teste dependia do gate antigo por e-mail
- [ ] Seguir os "Passos manuais pós-deploy" acima antes de considerar a Etapa 3 concluída — pendente, requer ação manual do usuário no dashboard do Supabase e SQL Editor
- [x] `git commit -m "feat: autenticacao contra o chore e resolucao dinamica do banco do usuario (etapa 3.B)"`
- [x] `git push origin main`
