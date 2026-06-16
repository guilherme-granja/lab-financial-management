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

---

## Contexto

A página de Contas exibe cards com saldo de cada conta. Não há nenhuma informação sobre volume de transações por conta. Não há navegação entre Contas e Transações. A página de Transações já tem filtros de tipo e período, mas não lê query params da URL.

---

## Task 1 — Hook: getAccountStats

**Arquivo:** `src/hooks/useAccounts.ts`

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

No rodapé de cada card de conta, adicionar 3 contadores clicáveis. Não alterar o layout do card acima da linha divisória (saldo, nome, tipo, badge).

Cada contador ao ser clicado navega via `useNavigate`:
```ts
// Despesas
navigate(`/transactions?account_id=${account.id}&type=expense&month=${currentMonth}`)

// Receitas
navigate(`/transactions?account_id=${account.id}&type=income&month=${currentMonth}`)

// Transferências
navigate(`/transactions?account_id=${account.id}&type=transfer&month=${currentMonth}`)
```

Onde `currentMonth` é o mês atual no formato `YYYY-MM` (ex: `2026-06`).

Carregar os stats via `getAccountStats(account.id, currentMonth)` ao montar o componente. Exibir `0` enquanto carrega — não usar loading spinner nos contadores para não poluir o card.

---

## Task 3 — Transactions.tsx: ler query params e aplicar filtros

**Arquivo:** `src/pages/Transactions.tsx`

No `useEffect` de montagem do componente, verificar query params com `useSearchParams`:

```ts
const [searchParams] = useSearchParams()

useEffect(() => {
  const accountId = searchParams.get('account_id')
  const type      = searchParams.get('type')
  const month     = searchParams.get('month')

  if (accountId) setFilterAccount(accountId)
  if (type)      setFilterType(type as TransactionType | 'transfer' | 'all')
  if (month)     setFilterMonth(month)
}, [])
```

Não limpar os query params da URL — manter para o usuário poder copiar o link. Não reescrever o arquivo inteiro — apenas adicionar o `useEffect` acima e garantir que os estados `filterAccount`, `filterType` e `filterMonth` já existam ou sejam criados se ainda não existirem.

---

## Checklist

- [ ] Task 1 — `getAccountStats` adicionado ao hook
- [ ] Task 2 — Stats clicáveis nos cards de conta
- [ ] Task 3 — Transactions.tsx lê query params na montagem
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: account stats with navigation to transactions"`
- [ ] `git push origin main && npm run deploy`