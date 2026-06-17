# SPEC — Valor Total por Tipo na Tela de Transações

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useCategories.ts`, `src/hooks/useAccounts.ts`, `src/hooks/useTags.ts`
- `src/types/index.ts`
- Qualquer arquivo de migração SQL (nenhuma alteração no banco)
- `src/components/ui/` (nenhum componente novo — usar apenas primitivos já existentes: `Badge`, `Card`, formatadores)

**Modelo:** Sonnet 4.6 High

**Paralelismo:** Tasks 1 e 2 são sequenciais — Task 2 consome o valor exportado pela Task 1.

---

## Contexto

`useTransactions` retorna `total` (count de registros via `{ count: 'exact' }`) e `transactions` (página atual, 20 itens). Não há soma monetária das transações filtradas. A query principal usa `.range(from, to)`, então somar `transactions.reduce` cobriria apenas a página visível, não o conjunto completo.

O objetivo é exibir a soma de `amount` de **todas** as transações que correspondem aos filtros ativos (período + tipo + status + categoria + conta + tag), sem alterar paginação. O banner de "Valor total" só aparece quando `filters.type !== 'all'`, pois é o único cenário onde somar um tipo específico gera informação semântica clara (ex: "Total de Despesas: R$ 4.320,00").

---

## Task 1 — Adicionar `filteredTotal` ao `useTransactions`

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: não

Adicionar uma segunda query paralela à principal, ativa somente quando `filters.type !== 'all'`. Essa query não tem `.range()` e seleciona apenas `amount`, retornando a soma no cliente.

Adicionar estado:
```ts
const [filteredTotal, setFilteredTotal] = useState<number | null>(null)
```

Dentro da função `fetch`, logo após montar os filtros comuns (período, tipo, status, categoria, conta, tag), executar a query de soma **em paralelo** com a query paginada:

```ts
// Query de soma — só executa quando tipo está filtrado
let sumQuery: Promise<{ data: { amount: number }[] | null; error: unknown }> | null = null
if (filters.type !== 'all') {
  sumQuery = supabase
    .from('transactions')
    .select('amount')
    .gte('date', dateStart)
    .lte('date', dateEnd)
    // aplicar os mesmos filtros condicionais da query principal (tipo, status, categoria, conta, tag)
    .then(({ data, error }) => ({ data: data as { amount: number }[] | null, error }))
}

const [{ data, error: err, count }, sumResult] = await Promise.all([
  query,
  sumQuery ?? Promise.resolve({ data: null, error: null }),
])
```

Depois de setar `transactions` e `total`, calcular e setar `filteredTotal`:
```ts
if (filters.type !== 'all' && sumResult.data) {
  setFilteredTotal(sumResult.data.reduce((acc, tx) => acc + tx.amount, 0))
} else {
  setFilteredTotal(null)
}
```

Incluir `filteredTotal` no objeto retornado:
```ts
return {
  // ... campos existentes sem alteração
  filteredTotal,
}
```

Restrições:
- Não reescrever a lógica de paginação, mutações nem as queries de recorrência
- Os filtros condicionais da query de soma devem espelhar exatamente os da query principal (mesmas condições `type`, `status`, `categoryId`, `account_id`, `tagId`)
- A soma usa `amount` bruto (sempre positivo no banco); a UI decide o prefixo

---

## Task 2 — Exibir banner "Valor total" na página de Transações

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Desestruturar `filteredTotal` do hook:
```ts
const { transactions, ..., filteredTotal } = useTransactions(filters)
```

Inserir o banner entre o bloco de chips ativos (`{/* Active Filter Chips */}`) e o bloco da tabela (`{/* Table */}`). O banner só renderiza quando `filteredTotal !== null`:

```tsx
{/* Valor Total */}
{filteredTotal !== null && (
  <div className="flex items-center justify-between px-4 py-2.5
                  bg-[#1a1d27] border border-[#2d3148] rounded-xl">
    <span className="text-slate-400 text-sm">
      Total de{' '}
      <span className="font-medium text-slate-200">
        {filters.type === 'income' ? 'Receitas' : filters.type === 'expense' ? 'Despesas' : 'Transferências'}
      </span>
      {/* se houver outros filtros ativos além de tipo, acrescentar contexto */}
      {activeChips.length > 1 && ' (filtros aplicados)'}
      {activeChips.length === 1 && ' no período'}
    </span>
    <span
      className={`text-lg font-bold tabular-nums ${
        filters.type === 'income'
          ? 'text-green-400'
          : filters.type === 'expense'
          ? 'text-red-400'
          : 'text-blue-400'
      }`}
    >
      {filters.type === 'income' ? '+' : filters.type === 'expense' ? '−' : ''}
      {formatCurrency(filteredTotal)}
    </span>
  </div>
)}
```

Restrições:
- Não alterar a lógica dos chips, filtros, tabela nem dialogs
- Não criar componente separado — o banner é inline suficientemente simples
- Usar `formatCurrency` já importado; não adicionar imports novos
- O prefixo `−` (menos tipográfico U+2212) para despesas é intencional — mais elegante que `-`

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: valor total por tipo na tela de transações"`
- [ ] `git push origin main && npm run deploy`