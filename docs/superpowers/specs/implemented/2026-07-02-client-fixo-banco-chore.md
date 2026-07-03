# SPEC — Client fixo do banco chore

**Data:** 2026-07-02
**Etapa:** 3 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `.env`, `.env.example`, `src/vite-env.d.ts`, `src/lib/chore-client.ts` (novo)
**Não tocar em:** `src/hooks/useAuth.tsx`, `src/hooks/useDatabase.tsx`, `src/router/index.tsx`, `src/main.tsx`, `src/lib/database-config-resolver.ts` — a integração do chore-client com o resto da aplicação é da Spec 3.B.
**Modelo:** Sonnet padrão
**Paralelismo:** Task 1 e Task 3 podem rodar em paralelo (arquivos distintos, sem dependência de output). Task 2 é rápida e independente das outras.

---

## Contexto

A partir desta etapa a aplicação passa a ter dois clients Supabase com papéis diferentes: o **client de dados**, dinâmico, resolvido depois do login e específico de cada usuário (já existe desde a Etapa 1, via `useSupabaseClient()`), e o **client do chore**, fixo, sempre apontando pro mesmo projeto — cuida só de autenticação e da leitura da tabela `user_databases`. Esta spec cria só a parte fixa. A integração entre os dois (login rodando contra o chore, resolução dinâmica do banco de dados a partir dele) é objeto da Spec 3.B.

---

## Task 1 — Variáveis de ambiente

**Arquivos:** `.env`, `.env.example`
> Review: não

Adicionar em `.env`:
```
VITE_CHORE_SUPABASE_URL=https://skfhscsbjeoogfeelirb.supabase.co
VITE_CHORE_SUPABASE_ANON_KEY=<anon key do projeto chore — Project Settings → API no dashboard do skfhscsbjeoogfeelirb>
```

Em `.env.example`, adicionar as mesmas duas chaves vazias. Não remover nem alterar nenhuma variável existente — a remoção de `VITE_ALLOWED_EMAIL` é da Spec 3.B.

---

## Task 2 — src/vite-env.d.ts

**Arquivo:** `src/vite-env.d.ts`
> Review: não

Adicionar ao `interface ImportMetaEnv` já existente:
```ts
readonly VITE_CHORE_SUPABASE_URL: string
readonly VITE_CHORE_SUPABASE_ANON_KEY: string
```

---

## Task 3 — Client fixo do chore

**Arquivo:** `src/lib/chore-client.ts`
> Review: sim

Arquivo novo. Diferente do client de dados (dinâmico, vive dentro do `DatabaseProvider`), o chore é sempre o mesmo projeto — não precisa de resolver nem de provider, é um client único criado no import, reutilizando a factory já existente:

```ts
import { createSupabaseClient } from './supabase'

export const choreClient = createSupabaseClient({
  url: import.meta.env.VITE_CHORE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_CHORE_SUPABASE_ANON_KEY,
})
```

Restrição: não chamar `createClient` do `@supabase/supabase-js` diretamente aqui — reaproveitar `createSupabaseClient` de `src/lib/supabase.ts` (criada na Etapa 1), para manter uma única forma de instanciar clients Supabase em todo o projeto.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `npx vitest run` — zero falhas (nada muda de comportamento ainda, `choreClient` não é importado por ninguém nesta spec)
- [ ] `git commit -m "feat: client fixo do banco chore (etapa 3.A)"`
- [ ] `git push origin main` — seguro, nenhum comportamento existente muda até a Spec 3.B
