# SPEC — Corrigir mock do chore-client nos testes

**Data:** 2026-07-03
**Etapa:** 4 do roadmap multi-tenant (correção de regressão introduzida na Etapa 3)
**Arquivos afetados:** `src/test/mocks/supabase.ts`, `src/pages/Dashboard.test.tsx`
**Não tocar em:** `src/lib/chore-client.ts`, `src/hooks/useAuth.tsx` — nenhum código de produção muda, só a infraestrutura de teste.
**Modelo:** Sonnet padrão
**Paralelismo:** Task 2 depende da Task 1.

---

## Contexto

`src/lib/chore-client.ts` cria um client Supabase real no momento do import (é intencionalmente um singleton fixo, ver Spec 3.A). Nenhum teste mocka esse módulo — `useAuth.tsx` passou a importar dele desde a Spec 3.B, mas só o client de dados (`@/hooks/useDatabase`) foi coberto na Spec 1.C. Isso quebra qualquer teste que renderize algo que importe `useAuth.tsx` de forma transitiva (hoje, só `Dashboard.test.tsx`, porque a página completa inclui Sidebar/logout) com `Error: supabaseUrl is required.` no CI.

---

## Task 1 — src/test/mocks/supabase.ts

**Arquivo:** `src/test/mocks/supabase.ts`
> Review: não

Adicionar um export reaproveitando o mesmo objeto `supabase` já mockado (mesma forma que `choreClient` precisa: `.from()` e `.auth.*`):

```ts
export const choreClient = supabase
```

Não criar um mock novo do zero — o `chore-client.ts` real só expõe um client com a mesma interface que o mock já simula.

---

## Task 2 — src/pages/Dashboard.test.tsx

**Arquivo:** `src/pages/Dashboard.test.tsx`
> Review: não

Adicionar, junto com o `vi.mock('@/hooks/useDatabase', ...)` já existente:

```ts
vi.mock('@/lib/chore-client', () => import('@/test/mocks/supabase'))
```

Antes de finalizar, checar se algum outro arquivo de teste (`Transactions.test.tsx`, `Categories.test.tsx`, `Reports.test.tsx`, `Goals.test.tsx`, se existirem) renderiza a página completa com `PageWrapper`/Sidebar da mesma forma que `Dashboard.test.tsx` — se sim, precisa do mesmo `vi.mock` adicionado. Rodar `npx vitest run` no final é o que confirma isso, não precisa adivinhar por leitura de código.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `npx vitest run` — zero falhas, incluindo `Dashboard.test.tsx` voltando a coletar testes normalmente (não mais "0 test")
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: mock do chore-client nos testes (corrige regressao da etapa 3)"`
- [ ] `git push origin main`
