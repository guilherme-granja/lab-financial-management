# SPEC-1 — Stats de Contas com Navegação

**Data:** 2026-06-16
**Arquivos afetados:** `useAccounts.ts`, `Accounts.tsx`, `Transactions.tsx`
**Não tocar em:** migrations, types, outros hooks, outras páginas

---

## Contexto

A página `Accounts.tsx` exibe cards com saldo por conta. Falta exibir contadores de transações do mês atual (receitas, despesas, transferências) em cada card, com navegação ao clicar para `/transactions` com filtros pré-aplicados.

`Transactions.tsx` já existe com filtros funcionais (account_id, type, month), mas ainda não lê query params da URL ao montar.

---

## Task 1 — Adicionar `getAccountStats` em `useAccounts.ts`

**Arquivo:** `src/hooks/useAccounts.ts`

Adicionar função ao retorno do hook:

```ts
async function getAccountStats(
  id: string,
  month: string  // formato 'YYYY-MM', ex: '2026-06'
): Promise<{ income: number; expense: number; transfer: number }> {
  const start = `${month}-01`
  const end = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
    .toISOString()
    .split('T')[0]  // último dia do mês

  const { data } = await supabase
    .from('transactions')
    .select('type, account_id, to_account_id')
    .gte('date', start)
    .lte('date', end)
    .or(`account_id.eq.${id},to_account_id.eq.${id}`)

  if (!data) return { income: 0, expense: 0, transfer: 0 }

  return {
    income:   data.filter((t) => t.type === 'income'   && t.account_id === id).length,
    expense:  data.filter((t) => t.type === 'expense'  && t.account_id === id).length,
    transfer: data.filter((t) => t.type === 'transfer' && (t.account_id === id || t.to_account_id === id)).length,
  }
}
```

Incluir `getAccountStats` no objeto retornado.

---

## Task 2 — Exibir stats nos cards em `Accounts.tsx`

**Arquivo:** `src/pages/Accounts.tsx`

### Estado novo
```ts
const [stats, setStats] = useState<Record<string, { income: number; expense: number; transfer: number }>>({})
```

Adicionar `getAccountStats` no destructuring do hook.

### Carregar stats junto com balances
No `useEffect` que já carrega balances, adicionar em paralelo:
```ts
const currentMonth = format(new Date(), 'yyyy-MM')  // date-fns já instalado
// dentro do Promise.all existente, adicionar:
getAccountStats(a.id, currentMonth).then((s) => ({ id: a.id, stats: s }))
```

Fazer dois `Promise.all` separados (balances e stats) ou um único com ambos — o que for mais limpo.

### UI — rodapé do card
Abaixo da linha que já mostra o saldo (`border-t border-[#2d3148]`), adicionar uma segunda linha com os três contadores.

Cada contador é clicável e navega para `/transactions` com query params:

```
💸 Despesas  → /transactions?account_id=UUID&type=expense&month=2026-06
💰 Receitas  → /transactions?account_id=UUID&type=income&month=2026-06
🔄 Transf.   → /transactions?account_id=UUID&type=transfer&month=2026-06
```

Usar `useNavigate` do `react-router-dom` para navegação.

Exemplo de estrutura JSX do rodapé (design livre seguindo o padrão do projeto):
```tsx
<div className="mt-2 pt-2 border-t border-[#2d3148] grid grid-cols-3 gap-1">
  {[
    { label: 'Despesas', emoji: '💸', type: 'expense', count: accountStats?.expense ?? 0 },
    { label: 'Receitas', emoji: '💰', type: 'income',  count: accountStats?.income  ?? 0 },
    { label: 'Transf.',  emoji: '🔄', type: 'transfer',count: accountStats?.transfer ?? 0 },
  ].map(({ label, emoji, type, count }) => (
    <button
      key={type}
      onClick={() => navigate(`/transactions?account_id=${account.id}&type=${type}&month=${currentMonth}`)}
      className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-[#0f1117] transition-colors cursor-pointer"
    >
      <span className="text-xs text-slate-500">{emoji} {label}</span>
      <span className="text-sm font-medium text-slate-300">{count}</span>
    </button>
  ))}
</div>
```

Se stats ainda não carregaram para aquela conta, exibir `—` no lugar do número.

---

## Task 3 — Ler query params em `Transactions.tsx`

**Arquivo:** `src/pages/Transactions.tsx`

### Import
```ts
import { useSearchParams } from 'react-router-dom'
```

### Lógica de inicialização
Logo no início do componente, antes dos estados de filtro:
```ts
const [searchParams, setSearchParams] = useSearchParams()
```

Ao montar o componente (useEffect com deps `[]`), verificar se existem os params `account_id`, `type` e `month`:

```ts
useEffect(() => {
  const accountId = searchParams.get('account_id')
  const type      = searchParams.get('type')
  const month     = searchParams.get('month')  // ex: '2026-06'

  if (accountId) setFilterAccountId(accountId)
  if (type && ['income', 'expense', 'transfer'].includes(type)) {
    setFilterType(type as TransactionType | 'all')
  }
  if (month) setFilterMonth(month)

  // Limpar query params da URL sem recarregar a página
  if (accountId || type || month) {
    setSearchParams({}, { replace: true })
  }
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Verificar os nomes exatos dos estados de filtro existentes em `Transactions.tsx` antes de implementar — usar os nomes que já existem, não criar novos.

---

## Checklist

- [ ] `getAccountStats` adicionado ao `useAccounts.ts` e no retorno do hook
- [ ] Stats carregando junto com balances no `useEffect` de `Accounts.tsx`
- [ ] Rodapé dos cards exibe 3 contadores com navegação
- [ ] Loading state dos stats: exibir `—` enquanto carrega
- [ ] `Transactions.tsx` lê `account_id`, `type`, `month` dos query params ao montar
- [ ] Query params limpos da URL após aplicar filtros
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: account stats with transaction navigation"`
- [ ] `git push origin main && npm run deploy`