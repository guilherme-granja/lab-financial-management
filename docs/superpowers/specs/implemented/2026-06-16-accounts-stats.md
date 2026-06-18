# SPEC — Stats de Contas com Navegação para Transações

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/hooks/useAccounts.ts`
- `src/pages/Accounts.tsx`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useTransactions.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Reports.tsx`
- `supabase/migrations/*`

**Modelo:** Sonnet 4.6 High

---

## Contexto

A página de Contas exibe cards com saldo de cada conta. Não há nenhuma informação sobre volume de transações por conta. Não há navegação entre Contas e Transações. A página de Transações já tem filtros de tipo e período via objeto `filters` (estado único com campos `period`, `type`, `categoryId`, `status`), mas não lê query params da URL. `TransactionFilters` não tem campo `account_id` — será necessário adicionar.

---

## Task 1 — Hook: getAccountStats

**Arquivo:** `src/hooks/useAccounts.ts`
> Review: não

Adicionar o método `getAccountStats` ao hook existente, sem alterar os métodos já existentes.

```ts
async function getAccountStats(
  accountId: string,
  month: string  // formato 'YYYY-MM'
): Promise<{ income: number; expense: number; transfer: number }> {
  const from = `${month}-01`
  const to = `${month}-31`

  const { data } = await supabase
    .from('transactions')
    .select('type, account_id, to_account_id')
    .gte('date', from)
    .lte('date', to)

  const rows = data ?? []
  return {
    income:   rows.filter(r => r.account_id === accountId && r.type === 'income').length,
    expense:  rows.filter(r => r.account_id === accountId && r.type === 'expense').length,
    transfer: rows.filter(r =>
      (r.account_id === accountId || r.to_account_id === accountId) &&
      r.type === 'transfer'
    ).length,
  }
}
```

Expor `getAccountStats` no retorno do hook.

---

## Task 2 — Accounts.tsx: stats clicáveis nos cards

**Arquivo:** `src/pages/Accounts.tsx`
> Review: sim

No rodapé de cada card de conta, adicionar 3 contadores clicáveis. Não alterar o layout do card acima da linha divisória (saldo, nome, tipo, badge).

Cada contador ao ser clicado navega via `useNavigate`:
```ts
navigate(`/transactions?account_id=${account.id}&type=expense&month=${currentMonth}`)
navigate(`/transactions?account_id=${account.id}&type=income&month=${currentMonth}`)
navigate(`/transactions?account_id=${account.id}&type=transfer&month=${currentMonth}`)
```

Onde `currentMonth` é o mês atual no formato `YYYY-MM` obtido com `format(new Date(), 'yyyy-MM')` do date-fns (já instalado).

Carregar os stats via `getAccountStats(account.id, currentMonth)` ao montar o componente. Exibir `0` enquanto carrega — não usar loading spinner nos contadores.

---

## Task 3 — useTransactions: adicionar account_id em TransactionFilters

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: não

Adicionar `account_id` à interface `TransactionFilters` (linha ~6):

```ts
export interface TransactionFilters {
  period: string
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string
  status: 'all' | 'paid' | 'unpaid'
  account_id: string | null   // NOVO
}
```

No valor inicial de `filters` em `Transactions.tsx` (linha ~58), adicionar `account_id: null`.

Na query do Supabase dentro do hook, aplicar o filtro quando `account_id` estiver preenchido:
```ts
if (filters.account_id) {
  query = query.eq('account_id', filters.account_id)
}
```

Não alterar mais nada no hook.

---

## Task 4 — Transactions.tsx: ler query params e aplicar filtros

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar `useSearchParams` do react-router-dom e um `useEffect` de montagem:

```ts
import { useSearchParams } from 'react-router-dom'

const [searchParams] = useSearchParams()

useEffect(() => {
  const accountId = searchParams.get('account_id')
  const type      = searchParams.get('type')
  const month     = searchParams.get('month')

  if (accountId || type || month) {
    setFilters((f) => ({
      ...f,
      ...(accountId ? { account_id: accountId } : {}),
      ...(type ? { type: type as TransactionType | 'all' } : {}),
      ...(month ? { period: month } : {}),
    }))
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Não limpar os query params da URL — manter para o usuário poder copiar o link.
Não reescrever o arquivo inteiro — apenas adicionar o import e o `useEffect` acima.

---

## Checklist

- [ ] Task 1 — `getAccountStats` adicionado ao hook
- [ ] Task 2 — Stats clicáveis nos cards de conta
- [ ] Task 3 — `account_id` adicionado a `TransactionFilters` e query do Supabase
- [ ] Task 4 — `Transactions.tsx` lê query params na montagem
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: account stats with navigation to transactions"`
- [ ] `git push origin main && npm run deploy`