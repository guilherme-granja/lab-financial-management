# SPEC — Visibilidade de Colunas na Tabela de Transações

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/pages/Transactions.tsx`

**Não tocar em:**
- Hooks (`useTransactions`, `useCategories`, `useAccounts`, `useTags`)
- Filtros, paginação, modais, lógica de formulário
- Qualquer outro arquivo fora de `Transactions.tsx`

**Modelo:** Sonnet 4.6 High

---

## Contexto

A tabela de transações exibe atualmente 8 colunas: **Data, Descrição, Conta, Categoria, Tag, Tipo, Status e Valor** — além da coluna de ações (sem cabeçalho). Todas aparecem sempre, sem controle do usuário. O objetivo é introduzir um seletor de colunas inline na barra de cabeçalho da página, que permite esconder/mostrar colunas opcionais em tempo real. A preferência deve ser persistida via `localStorage` para sobreviver a recarregamentos.

---

## Definição das colunas

| Chave | Rótulo | Padrão |
|---|---|---|
| `date` | Data | ✅ visível |
| `account` | Conta | ✅ visível |
| `category` | Categoria | ✅ visível |
| `type` | Tipo | ✅ visível |
| `amount` | Valor | ✅ visível |
| `description` | Descrição | ❌ oculta |
| `tag` | Tag | ❌ oculta |
| `status` | Status | ❌ oculta |

As 5 colunas padrão nunca desaparecem do seletor — elas têm checkbox marcado e desabilitado (`disabled`), não podem ser desmarcadas. As 3 opcionais têm checkbox ativável livremente.

---

## Task 1 — Estado de visibilidade + persistência

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

Adicionar logo após as demais declarações de `useState` (por volta da linha 110):

```ts
type ColumnKey = 'date' | 'account' | 'category' | 'type' | 'amount' | 'description' | 'tag' | 'status'

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  date: true,
  account: true,
  category: true,
  type: true,
  amount: true,
  description: false,
  tag: false,
  status: false,
}

const STORAGE_KEY = 'transactions_column_visibility'

function loadColumnVisibility(): Record<ColumnKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    return { ...DEFAULT_VISIBLE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_VISIBLE
  }
}

// Dentro do componente Transactions():
const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(loadColumnVisibility)
const [columnPickerOpen, setColumnPickerOpen] = useState(false)

function toggleColumn(key: ColumnKey) {
  const FIXED: ColumnKey[] = ['date', 'account', 'category', 'type', 'amount']
  if (FIXED.includes(key)) return
  setColumnVisibility((prev) => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  })
}
```

Não alterar nenhum outro estado existente.

---

## Task 2 — Botão e dropdown de seleção de colunas

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar o import de `Columns` do `lucide-react` na linha de imports já existente:

```ts
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard, X, AlertTriangle, Columns } from 'lucide-react'
```

Na barra de botões acima da tabela (linha ~720), inserir o botão de colunas **imediatamente antes** do botão "Nova transação" (que tem `ml-auto`):

```tsx
{/* Column picker */}
<div className="relative">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setColumnPickerOpen((v) => !v)}
    className="text-slate-400 hover:text-slate-200 gap-1.5 h-9 border border-[#2d3148]"
  >
    <Columns size={14} />
    Colunas
  </Button>

  {columnPickerOpen && (
    <>
      {/* Overlay para fechar ao clicar fora */}
      <div
        className="fixed inset-0 z-10"
        onClick={() => setColumnPickerOpen(false)}
      />
      <div className="absolute right-0 top-10 z-20 bg-[#1a1d27] border border-[#2d3148] rounded-lg shadow-xl p-3 w-52 space-y-1">
        <p className="text-slate-500 text-xs pb-1 border-b border-[#2d3148]">Exibir colunas</p>
        {(
          [
            { key: 'date',        label: 'Data',      fixed: true  },
            { key: 'description', label: 'Descrição', fixed: false },
            { key: 'account',     label: 'Conta',     fixed: true  },
            { key: 'category',    label: 'Categoria', fixed: true  },
            { key: 'tag',         label: 'Tag',       fixed: false },
            { key: 'type',        label: 'Tipo',      fixed: true  },
            { key: 'status',      label: 'Status',    fixed: false },
            { key: 'amount',      label: 'Valor',     fixed: true  },
          ] as { key: ColumnKey; label: string; fixed: boolean }[]
        ).map(({ key, label, fixed }) => (
          <label
            key={key}
            className={`flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-[#2d3148] transition-colors ${fixed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={columnVisibility[key]}
              disabled={fixed}
              onChange={() => toggleColumn(key)}
              className="accent-indigo-500 w-3.5 h-3.5"
            />
            <span className="text-slate-300 text-sm">{label}</span>
            {fixed && <span className="ml-auto text-slate-600 text-xs">padrão</span>}
          </label>
        ))}
      </div>
    </>
  )}
</div>

<Button onClick={openCreate} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
  ...
</Button>
```

A ordem das colunas no dropdown deve seguir a ordem de aparição na tabela. O dropdown abre/fecha com o botão e fecha ao clicar no overlay transparente. Não usar `Dialog` para este picker — é um popover simples com posicionamento absoluto.

---

## Task 3 — Aplicar visibilidade na tabela

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

No `<TableHeader>`, substituir os `<TableHead>` fixos por renderização condicional usando `columnVisibility`:

```tsx
<TableHeader>
  <TableRow className="border-[#2d3148] hover:bg-transparent">
    {columnVisibility.date        && <TableHead className="text-slate-400">Data</TableHead>}
    {columnVisibility.description && <TableHead className="text-slate-400">Descrição</TableHead>}
    {columnVisibility.account     && <TableHead className="text-slate-400">Conta</TableHead>}
    {columnVisibility.category    && <TableHead className="text-slate-400">Categoria</TableHead>}
    {columnVisibility.tag         && <TableHead className="text-slate-400">Tag</TableHead>}
    {columnVisibility.type        && <TableHead className="text-slate-400">Tipo</TableHead>}
    {columnVisibility.status      && <TableHead className="text-slate-400">Status</TableHead>}
    {columnVisibility.amount      && <TableHead className="text-slate-400 text-right">Valor</TableHead>}
    <TableHead className="text-slate-400 w-28" />
  </TableRow>
</TableHeader>
```

No `<TableBody>`, dentro do `transactions.map((tx) => ...)`, aplicar a mesma condicional em cada `<TableCell>`:

```tsx
<TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
  {columnVisibility.date        && <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>}
  {columnVisibility.description && (
    <TableCell className="text-slate-300">
      <span>{tx.description ?? '—'}</span>
      {recurrenceBadge(tx)}
    </TableCell>
  )}
  {columnVisibility.account && (
    <TableCell className="text-slate-300 text-sm">
      {/* conteúdo existente de conta/toAccount */}
    </TableCell>
  )}
  {columnVisibility.category && (
    <TableCell className="text-slate-300">
      {/* conteúdo existente de categoria */}
    </TableCell>
  )}
  {columnVisibility.tag && (
    <TableCell className="text-slate-300">
      {/* conteúdo existente de tag */}
    </TableCell>
  )}
  {columnVisibility.type && (
    <TableCell>
      {/* badge de tipo existente */}
    </TableCell>
  )}
  {columnVisibility.status && (
    <TableCell>
      {/* badge de status existente */}
    </TableCell>
  )}
  {columnVisibility.amount && (
    <TableCell className={`text-right font-medium ${amountColor(tx.type)}`}>
      {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
    </TableCell>
  )}
  <TableCell>
    {/* botões de ação — nunca ocultados */}
  </TableCell>
</TableRow>
```

Nas linhas de estado vazio e loading, o `colSpan` precisa ser calculado dinamicamente. Substituir o valor fixo `9` por:

```tsx
const visibleCount = Object.values(columnVisibility).filter(Boolean).length + 1 // +1 pela coluna de ações
```

E usar `colSpan={visibleCount}` nas células de loading/empty.

Não alterar o conteúdo das células — copiar exatamente o JSX existente dentro de cada condicional.

---

## Checklist

- [ ] Task 1 concluída — tipo `ColumnKey`, defaults, `localStorage`, estado e `toggleColumn`
- [ ] Task 2 concluída — botão "Colunas" + dropdown com checkboxes e overlay
- [ ] Task 3 concluída — `TableHead` e `TableCell` condicionais, `colSpan` dinâmico
- [ ] Teste manual: colunas padrão visíveis ao carregar pela primeira vez
- [ ] Teste manual: marcar "Descrição" → coluna aparece imediatamente
- [ ] Teste manual: desmarcar "Tag" → coluna desaparece, demais intactas
- [ ] Teste manual: tentar desmarcar coluna padrão (ex: Valor) → checkbox desabilitado
- [ ] Teste manual: recarregar a página → preferência preservada
- [ ] Teste manual: clicar fora do dropdown → dropdown fecha
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: seletor de colunas visíveis na tabela de transações"`
- [ ] `git push origin main && npm run deploy`