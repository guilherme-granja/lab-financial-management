# SPEC — Extração de queries do Dashboard e Reports para hooks

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/hooks/useDashboard.ts` (novo)
- `src/hooks/useReports.ts` (novo)
- `src/pages/Dashboard.tsx`
- `src/pages/Reports.tsx`

**Não tocar em:**
- `src/hooks/useAuth.tsx`
- `src/hooks/useTransactions.ts`
- `src/hooks/useCategories.ts`
- `src/hooks/useAccounts.ts`
- `src/lib/supabase.ts`
- `src/types/index.ts`
- Componentes de gráficos em `src/components/charts/`

**Modelo:** Sonnet 4.6 High

**Paralelismo:** Tasks 1 e 2 podem rodar em paralelo (arquivos distintos, sem dependência entre si). Tasks 3 e 4 dependem respectivamente de 1 e 2 — sequenciais após seus hooks.

---

## Contexto

`Dashboard.tsx` e `Reports.tsx` importam e chamam `supabase` diretamente, violando a regra de arquitetura definida em `docs/superpowers/architecture.md`. Toda lógica de banco de dados deve ficar em hooks em `src/hooks/`. As páginas devem conter apenas JSX e chamadas aos hooks.

---

## Task 1 — Criar `useDashboard.ts`

**Arquivo:** `src/hooks/useDashboard.ts`
> Review: sim

Criar hook extraindo toda a lógica de `Dashboard.tsx`. O hook recebe `period: string` (formato `'yyyy-MM'`) como parâmetro e retorna:

```ts
interface DashboardData {
  summary: { income: number; expenses: number; balance: number; pending: number }
  lineData: BalanceDataPoint[]
  donutData: DonutDataPoint[]
  recentTx: Transaction[]
  loading: boolean
}

export function useDashboard(period: string): DashboardData
```

Importar `BalanceDataPoint` de `@/components/charts/BalanceLineChart` e `DonutDataPoint` de `@/components/charts/TopCategoriesDonutChart` — esses tipos já existem e devem ser reusados.

A lógica interna (as queries, o `Promise.all`, o cálculo de `summary`, `catMap`, `lineData`) é idêntica ao `useEffect` atual de `Dashboard.tsx` — mover sem alterar a lógica.

Restrições:
- Não usar `useState` para `period` dentro do hook — receber como parâmetro
- `useEffect` dispara quando `period` muda
- `loading` inicia como `true` e vai para `false` ao final do `load()`

---

## Task 2 — Criar `useReports.ts`

**Arquivo:** `src/hooks/useReports.ts`
> Review: sim

Criar hook extraindo toda a lógica de `Reports.tsx`. O hook recebe `selectedMonth: string` como parâmetro e retorna:

```ts
interface ReportsData {
  categoryRows: CategoryRow[]
  barData: MonthlyDataPoint[]
  loading: boolean
}

// CategoryRow deve ser definido no próprio arquivo do hook
interface CategoryRow {
  category_id: string | null
  name: string
  icon: string
  total: number
  percent: number
  type: 'income' | 'expense'
}

export function useReports(selectedMonth: string): ReportsData
```

Importar `MonthlyDataPoint` de `@/components/charts/MonthlyBarChart`.

A lógica interna (o `useEffect`, as queries, a construção de `catMap` e `monthsData`) é idêntica ao `useEffect` atual de `Reports.tsx` — mover sem alterar.

Restrições:
- `CategoryRow` fica definido neste arquivo (não em `src/types/index.ts` — é específico de relatórios)
- Não incluir a lógica de `displayRows` (agrupamento por `groupByParent`) — ela usa `categoryTree` e fica na página

---

## Task 3 — Atualizar `Dashboard.tsx`

**Arquivo:** `src/pages/Dashboard.tsx`
> Review: não

Remover o import de `supabase` e todo o `useEffect` de carregamento. Substituir pelo hook:

```tsx
import { useDashboard } from '@/hooks/useDashboard'

// dentro do componente, substituir os useState + useEffect por:
const { summary, lineData, donutData, recentTx, loading } = useDashboard(period)
```

Manter: `period`, `navigatePeriod`, o JSX completo do return. Apenas o bloco de carregamento de dados muda.

Restrições:
- Não alterar nada no JSX de retorno
- Não remover `useState` de `period` — continua gerenciado na página

---

## Task 4 — Atualizar `Reports.tsx`

**Arquivo:** `src/pages/Reports.tsx`
> Review: não

Remover o import de `supabase` e o `useEffect` de carregamento. Substituir pelo hook:

```tsx
import { useReports } from '@/hooks/useReports'
// remover o import de CategoryRow — agora é interno ao hook

// dentro do componente:
const { categoryRows, barData, loading } = useReports(selectedMonth)
```

Manter: `selectedMonth`, `groupByParent`, `displayRows` (useMemo que depende de `categoryRows` e `categoryTree`), `exportCSV`, e todo o JSX.

Restrições:
- `CategoryRow` não é mais importado — atualizar o tipo de `displayRows` se necessário usando `ReturnType` ou duplicar a interface localmente só para o `useMemo` (preferir duplicar para evitar export do tipo interno do hook)
- Não alterar nada no JSX de retorno

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] Task 4 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `Dashboard.tsx` e `Reports.tsx` sem nenhum import de `@/lib/supabase`
- [ ] `git commit -m "refactor: extrair queries de Dashboard e Reports para hooks"`
- [ ] `git push origin main && npm run deploy`
