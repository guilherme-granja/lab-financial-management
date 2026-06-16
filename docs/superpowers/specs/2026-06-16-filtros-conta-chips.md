# SPEC — Filtro por Conta + Active Filter Chips em Transações

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useAccounts.ts`
- `src/hooks/useCategories.ts`
- `src/components/ui/select.tsx`
- `src/components/ui/badge.tsx`

**Modelo:** Sonnet 4.6 High

---

## Contexto

A página de Contas redireciona para `/transactions?account_id=X&type=Y&month=Z` ao clicar nos totais de receita, despesa e transferência de cada conta. O hook `useTransactions` filtra por tipo, status e categoria, mas não tem suporte a `account_id` — o usuário chega na tela filtrado sem saber, sem poder ver qual conta está ativa e sem como remover o filtro.

Os demais filtros (tipo, status, categoria) têm o mesmo problema: são aplicados mas não há indicação visual de quais estão ativos nem como limpá-los individualmente.

A solução é: (1) adicionar `account_id` ao tipo `TransactionFilters` e à query do hook, (2) adicionar leitura de `searchParams` no componente para popular o filtro ao chegar via redirect de Contas, (3) adicionar select de Conta na barra de filtros, (4) adicionar linha de chips de filtros ativos abaixo da barra com possibilidade de remover cada um individualmente, e (5) adicionar botão "Limpar filtros" que reseta todos de uma vez.

---

## Task 1 — Atualizar `useTransactions.ts`

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: sim

### 1a — Adicionar `account_id` à interface `TransactionFilters`

Localizar a interface e adicionar o campo opcional:

```ts
export interface TransactionFilters {
  period: string
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string
  status: 'all' | 'paid' | 'unpaid'
  account_id: string | null   // ← adicionar esta linha
}
```

### 1b — Aplicar o filtro de `account_id` na query do Supabase

Na função `fetch`, após o bloco de `filters.status`, adicionar:

```ts
if (filters.account_id !== null) {
  query = query.eq('account_id', filters.account_id)
}
```

---

## Task 2 — Atualizar `Transactions.tsx` (4 adições cirúrgicas)

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

### Adição 1 — Imports necessários

Adicionar `useEffect` ao import do React e `useSearchParams` ao import do react-router-dom. Adicionar `X` ao import do lucide-react:

```tsx
// Antes:
import { useState } from 'react'
// Depois:
import { useState, useEffect } from 'react'

// Antes (se existir import de react-router-dom) — adicionar useSearchParams
// Se não existir import de react-router-dom, criar:
import { useSearchParams } from 'react-router-dom'

// Lucide — antes:
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'
// Depois:
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard, X } from 'lucide-react'
```

### Adição 2 — Constantes, helpers e leitura de URL

Adicionar imediatamente antes do `return`, logo após os hooks de dados (`useTransactions`, `useCategories`, `useAccounts`):

```ts
const [searchParams] = useSearchParams()

// Populando filtros a partir de searchParams ao carregar via redirect de Contas
useEffect(() => {
  const accountId = searchParams.get('account_id')
  const type = searchParams.get('type') as TransactionType | 'all' | null
  const month = searchParams.get('month')

  setFilters((f) => ({
    ...f,
    account_id: accountId ?? null,
    type: type ?? 'all',
    period: month ?? f.period,
  }))
}, []) // eslint-disable-line react-hooks/exhaustive-deps

const DEFAULT_FILTERS: TransactionFilters = {
  period: CURRENT_MONTH,
  periodType: 'monthly',
  type: 'all',
  categoryId: 'all',
  status: 'all',
  account_id: null,
}

function clearFilters() {
  setFilters(DEFAULT_FILTERS)
}

const hasActiveFilters =
  filters.type !== 'all' ||
  filters.categoryId !== 'all' ||
  filters.status !== 'all' ||
  filters.account_id !== null
```

O período (`period` / `periodType`) é considerado controle de navegação, não "filtro ativo" — não entra no `hasActiveFilters` e não aparece como chip.

Também substituir o objeto inicial do `useState` por `DEFAULT_FILTERS`:

```ts
// Antes:
const [filters, setFilters] = useState<TransactionFilters>({
  period: CURRENT_MONTH,
  periodType: 'monthly',
  type: 'all',
  categoryId: 'all',
  status: 'all',
})

// Depois:
const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS)
```

> Atenção: `DEFAULT_FILTERS` precisa ser declarada **fora** do componente (logo antes de `export default function Transactions()`) para poder ser usada no `useState` sem referência circular. Mover a constante para fora do componente e manter `clearFilters` e `hasActiveFilters` dentro.

### Adição 3 — Select de Conta na barra de filtros + botão "Limpar filtros"

Inserir na `div` com `className="flex flex-wrap gap-3 items-end"`, **após o select de Categoria e antes do botão "Nova transação"**:

```tsx
<div className="space-y-1">
  <Label className="text-slate-400 text-xs">Conta</Label>
  <Select
    value={filters.account_id ?? 'all'}
    onValueChange={(v) =>
      setFilters((f) => ({ ...f, account_id: v === 'all' ? null : v }))
    }
  >
    <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-44">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
      <SelectItem value="all">Todas as contas</SelectItem>
      {accounts.map((a) => (
        <SelectItem key={a.id} value={a.id}>
          {a.icon} {a.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{hasActiveFilters && (
  <Button
    variant="ghost"
    size="sm"
    onClick={clearFilters}
    className="text-slate-400 hover:text-slate-200 gap-1.5 h-9"
  >
    <X size={14} />
    Limpar filtros
  </Button>
)}
```

`accounts` já está disponível no componente via `useAccounts()`.

### Adição 4 — Linha de Active Filter Chips

Montar a lista de chips ativos como array derivado (dentro do componente, antes do `return`):

```ts
interface ActiveChip {
  key: string
  label: string
  onRemove: () => void
}

const activeChips: ActiveChip[] = []

if (filters.type !== 'all') {
  const typeLabels: Record<string, string> = {
    income: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência',
  }
  activeChips.push({
    key: 'type',
    label: `Tipo: ${typeLabels[filters.type] ?? filters.type}`,
    onRemove: () => setFilters((f) => ({ ...f, type: 'all' })),
  })
}

if (filters.status !== 'all') {
  const statusLabels: Record<string, string> = { paid: 'Pagos', unpaid: 'Pendentes' }
  activeChips.push({
    key: 'status',
    label: `Status: ${statusLabels[filters.status] ?? filters.status}`,
    onRemove: () => setFilters((f) => ({ ...f, status: 'all' })),
  })
}

if (filters.categoryId !== 'all') {
  const cat = categories.find((c) => c.id === filters.categoryId)
  activeChips.push({
    key: 'category',
    label: `Categoria: ${cat ? `${cat.icon} ${cat.name}` : filters.categoryId}`,
    onRemove: () => setFilters((f) => ({ ...f, categoryId: 'all' })),
  })
}

if (filters.account_id !== null) {
  const acc = accounts.find((a) => a.id === filters.account_id)
  activeChips.push({
    key: 'account',
    label: `Conta: ${acc ? `${acc.icon} ${acc.name}` : filters.account_id}`,
    onRemove: () => setFilters((f) => ({ ...f, account_id: null })),
  })
}
```

`categories` já está disponível via `useCategories()`.

**JSX da linha de chips** — inserir entre a `div` dos filtros e a `div` da tabela:

```tsx
{hasActiveFilters && (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-slate-500 text-xs">Filtros ativos:</span>
    {activeChips.map((chip) => (
      <span
        key={chip.key}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                   bg-indigo-950 border border-indigo-800 text-indigo-300"
      >
        {chip.label}
        <button
          onClick={chip.onRemove}
          className="text-indigo-400 hover:text-indigo-200 leading-none"
          aria-label={`Remover filtro ${chip.label}`}
        >
          <X size={11} />
        </button>
      </span>
    ))}
  </div>
)}
```

---

## Comportamentos esperados

| Ação | Resultado |
|---|---|
| Chega via redirect de Contas com `?account_id=X&type=Y&month=Z` | Select de Conta e Tipo mostram os valores; chips aparecem para Conta e Tipo |
| Clica X no chip de Conta | Select de Conta volta para "Todas as contas"; chip some; query refaz sem `account_id` |
| Clica X no chip de Tipo | Select de Tipo volta para "Todos"; chip some |
| Clica "Limpar filtros" | Todos os selects voltam ao padrão; linha de chips desaparece; período permanece |
| Altera select de Conta diretamente | Chip de Conta aparece/atualiza refletindo o select |
| Nenhum filtro ativo | Linha de chips e botão "Limpar filtros" não aparecem |

---

## Checklist

- [ ] `account_id: string | null` adicionado a `TransactionFilters` em `useTransactions.ts`
- [ ] Filtro de `account_id` aplicado na query do Supabase (`.eq('account_id', ...)`)
- [ ] `useEffect` de `searchParams` popula `account_id`, `type` e `period` ao montar
- [ ] `DEFAULT_FILTERS` declarada fora do componente; `useState` inicial usa `DEFAULT_FILTERS`
- [ ] Select "Conta" adicionado na barra de filtros; popula com `accounts`
- [ ] Select de Conta sincroniza com `filters.account_id` (null ↔ 'all' na ponte)
- [ ] Botão "Limpar filtros" aparece apenas quando `hasActiveFilters === true`
- [ ] `clearFilters` reseta todos os filtros; período não é resetado
- [ ] Linha de chips aparece quando `hasActiveFilters === true`
- [ ] Cada chip exibe rótulo legível (nome da conta/categoria, não UUID)
- [ ] Botão X de cada chip remove somente aquele filtro; select correspondente reflete
- [ ] Redirect de Contas → Transações: conta e tipo aparecem nos selects e nos chips
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: filtro por conta e active filter chips em Transações"`
- [ ] `git push origin main && npm run deploy`