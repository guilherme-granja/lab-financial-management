# SPEC — Melhorias no Dashboard

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/pages/Dashboard.tsx`
- `src/components/charts/BalanceLineChart.tsx`
- `src/components/charts/ExpensePieChart.tsx` *(renomear para `TopCategoriesDonutChart.tsx`)*
- `src/pages/Transactions.tsx`

**Não tocar em:**
- Lógica de autenticação, rotas, hooks
- Bloco "Transações recentes" — manter intacto
- Card "Saldo do mês" — manter intacto (sem navegação, é calculado)
- Supabase migrations

**Modelo:** Sonnet 4.6 High

---

## Contexto

O Dashboard carrega sempre o mês corrente de forma fixa no `useEffect`, sem permitir navegar entre meses. Os cards de resumo são elementos estáticos sem interação. O gráfico de linha mostra apenas o saldo líquido por mês (receita − despesa), perdendo a visualização separada de entradas e saídas. O gráfico de pizza agrupa por categoria pai e exibe todas as categorias sem limite. Nenhum dos dois gráficos responde à seleção de mês.

---

## Task 1 — Seletor de mês e estado centralizado de período

**Arquivo:** `src/pages/Dashboard.tsx`
> Review: não

Adicionar imports necessários no topo:

```ts
import { addMonths, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react'
```

Substituir o estado atual por um estado de período navegável. Dentro do componente, antes dos outros estados:

```ts
const navigate = useNavigate()

// período selecionado no formato 'yyyy-MM'; inicia sempre no mês corrente
const [period, setPeriod] = useState<string>(format(new Date(), 'yyyy-MM'))

function navigatePeriod(delta: number) {
  setPeriod((prev) => {
    const current = parseISO(`${prev}-01`)
    return format(addMonths(current, delta), 'yyyy-MM')
  })
}
```

No `useEffect`, substituir `const now = new Date()` por derivações a partir de `period`:

```ts
useEffect(() => {
  async function load() {
    const periodDate = parseISO(`${period}-01`)
    const monthStart = format(startOfMonth(periodDate), 'yyyy-MM-dd')
    const monthEnd   = format(endOfMonth(periodDate), 'yyyy-MM-dd')
    // ... resto da lógica existente, sem alterações
  }
  load()
}, [period]) // <— dependência: period
```

No JSX, adicionar o seletor de mês no topo do `return`, antes do grid de cards. Seguir o mesmo padrão visual do seletor de período de `Transactions.tsx`:

```tsx
{/* Seletor de mês */}
<div className="flex items-center gap-0.5 bg-[#1a1d27] border border-[#2d3148] rounded-lg h-9 px-1 w-fit">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
    onClick={() => navigatePeriod(-1)}
  >
    <ChevronLeft size={14} />
  </Button>
  <span className="text-slate-200 text-sm w-36 text-center capitalize select-none">
    {format(parseISO(`${period}-01`), 'MMMM yyyy', { locale: ptBR })}
  </span>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
    onClick={() => navigatePeriod(1)}
  >
    <ChevronRight size={14} />
  </Button>
</div>
```

O gráfico de balanço histórico (últimos 6 meses) **não** deve mudar com a seleção de mês — ele sempre mostra os 6 meses anteriores ao mês corrente (`new Date()`). Apenas as queries de summary, pie e recentTx usam `period`.

---

## Task 2 — Cards clicáveis com navegação para Transações

**Arquivo:** `src/pages/Dashboard.tsx`
> Review: não

Os cards "Receitas do mês", "Despesas do mês" e "A pagar este mês" devem navegar para `/transactions` com query params que pré-aplicam os filtros correspondentes. O card "Saldo do mês" não é clicável.

Cada card clicável recebe `onClick`, `cursor-pointer` e `hover:border-indigo-600/50 transition-colors`:

```tsx
{/* Receitas do mês */}
<Card
  className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
  onClick={() => navigate(`/transactions?type=income&month=${period}`)}
>

{/* Despesas do mês */}
<Card
  className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
  onClick={() => navigate(`/transactions?type=expense&month=${period}`)}
>

{/* A pagar este mês */}
<Card
  className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
  onClick={() => navigate(`/transactions?status=unpaid&month=${period}`)}
>

{/* Saldo do mês — sem onClick, sem hover especial */}
<Card className="bg-[#1a1d27] border-[#2d3148]">
```

O `month` passado no query param é o `period` selecionado no Dashboard, para que Transações abra já no mês que o usuário está visualizando.

---

## Task 3 — Suporte a `?status=` em Transactions

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

Atualmente `useSearchParams` lê `account_id`, `type` e `month`, mas não lê `status`. Adicionar a leitura do param `status` dentro do `useEffect` de inicialização (ao lado dos demais `searchParams.get`):

```ts
const status = searchParams.get('status')

if (accountId || type || month || status) {
  setFilters((f) => ({
    ...f,
    ...(accountId ? { account_id: accountId } : {}),
    ...(type   ? { type:   type   as TransactionType | 'all' } : {}),
    ...(month  ? { period: month } : {}),
    ...(status ? { status: status as 'all' | 'paid' | 'unpaid' } : {}),
  }))
}
```

Não alterar mais nada neste arquivo.

---

## Task 4 — Gráfico de Balanço (substituir BalanceLineChart)

**Arquivo:** `src/components/charts/BalanceLineChart.tsx`
> Review: sim

Substituir o tipo `BalanceDataPoint` e o componente para exibir **receita e despesa como duas linhas separadas**, em vez do saldo líquido. Isso torna imediatamente visível quando os gastos se aproximam ou superam as receitas — muito mais informativo do que a linha única de saldo.

Novo contrato de dados:

```ts
export interface BalanceDataPoint {
  month: string    // mantém o mesmo nome para não quebrar o Dashboard
  income: number   // receita do mês
  expense: number  // despesa do mês
}
```

Novo componente (mesmo nome de export `BalanceLineChart`, mesmo arquivo):

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export function BalanceLineChart({ data }: { data: BalanceDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'income' ? 'Receitas' : 'Despesas',
          ]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {value === 'income' ? 'Receitas' : 'Despesas'}
            </span>
          )}
        />
        <Line type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

No `Dashboard.tsx`, atualizar a montagem de `lineData` para usar o novo formato:

```ts
setLineData(
  historyData.map(({ month, data }) => {
    const income  = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { month, income, expense }  // removido: balance
  })
)
```

E atualizar o título do card de `"Saldo — últimos 6 meses"` para `"Balanço — últimos 6 meses"`.

---

## Task 5 — Gráfico de Rosca: Top 5 subcategorias

**Arquivo:** `src/components/charts/ExpensePieChart.tsx`
> Review: sim

Renomear o arquivo para `TopCategoriesDonutChart.tsx` e atualizar o export. O componente existente agrupava por categoria pai; o novo deve receber os dados já prontos (top 5, ordenados por valor desc), com cores fixas geradas no Dashboard — não depende mais de `category.color`.

Novo contrato:

```ts
export interface DonutDataPoint {
  name: string   // nome da subcategoria (ou categoria se não houver pai)
  value: number  // total gasto
  color: string  // cor atribuída pelo Dashboard
}
```

O componente em si muda apenas o nome do export e o tipo — a implementação de rosca já existe (`innerRadius={55} outerRadius={80}`). Adicionar `label` nas fatias para mostrar percentual:

```tsx
<Pie
  data={data}
  cx="50%"
  cy="50%"
  innerRadius={55}
  outerRadius={80}
  paddingAngle={2}
  dataKey="value"
  label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
  labelLine={false}
>
```

No `Dashboard.tsx`:

1. Atualizar o import: `import { TopCategoriesDonutChart } from '@/components/charts/TopCategoriesDonutChart'`
2. Atualizar o tipo: `import type { DonutDataPoint } from '@/components/charts/TopCategoriesDonutChart'`
3. Atualizar o estado: `const [donutData, setDonutData] = useState<DonutDataPoint[]>([])`
4. Atualizar a query de despesas para trazer a subcategoria (category_id da transação é sempre a leaf node):

```ts
// A query já existe — só adicionar que precisamos do parent via join aninhado:
supabase
  .from('transactions')
  .select('amount, categories(id, name, color, parent_id, parent:categories!parent_id(name))')
  .eq('type', 'expense')
  .eq('paid', true)
  .gte('date', monthStart)
  .lte('date', monthEnd)
  .or(accountFilter()),
```

5. Atualizar o processamento dos dados — agrupar pela categoria leaf (subcategoria), pegar top 5, atribuir paleta de cores fixa:

```ts
const DONUT_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4']

const catMap: Record<string, { name: string; total: number }> = {}
for (const tx of pieRes.data ?? []) {
  const cat = tx.categories as unknown as {
    id: string; name: string; parent_id: string | null;
    parent?: { name: string } | null
  } | null
  // Usar nome da subcategoria; se não houver pai, usar o próprio nome
  const label = cat?.name ?? 'Sem categoria'
  if (!catMap[label]) catMap[label] = { name: label, total: 0 }
  catMap[label].total += Number(tx.amount)
}

const top5 = Object.values(catMap)
  .sort((a, b) => b.total - a.total)
  .slice(0, 5)
  .map((c, i) => ({ name: c.name, value: c.total, color: DONUT_COLORS[i] }))

setDonutData(top5)
```

6. No JSX, substituir `<ExpensePieChart data={pieData} />` por `<TopCategoriesDonutChart data={donutData} />` e o título do card de `"Despesas por categoria"` para `"Top 5 subcategorias — despesas"`.

---

## Checklist

- [ ] Task 1 concluída — `period` state, `navigatePeriod`, `useEffect` reativo, seletor de mês no JSX
- [ ] Task 2 concluída — 3 cards com `onClick` + `hover`, card Saldo sem interação
- [ ] Task 3 concluída — `?status=` lido em `Transactions.tsx`
- [ ] Task 4 concluída — `BalanceLineChart` com duas linhas (verde/vermelho), `lineData` com `income`/`expense`
- [ ] Task 5 concluída — `TopCategoriesDonutChart`, query com leaf category, top 5, paleta fixa
- [ ] Teste manual: navegar meses → cards e gráfico de rosca atualizam; gráfico de balanço permanece fixo nos últimos 6 meses reais
- [ ] Teste manual: clicar "Receitas do mês" → Transações abre filtrado por `type=income` no mês correto
- [ ] Teste manual: clicar "Despesas do mês" → Transações abre filtrado por `type=expense`
- [ ] Teste manual: clicar "A pagar este mês" → Transações abre filtrado por `status=unpaid`
- [ ] Teste manual: gráfico de balanço exibe duas linhas (verde receitas, vermelho despesas)
- [ ] Teste manual: gráfico de rosca exibe no máximo 5 fatias com percentual nas fatias > 5%
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: melhorias no dashboard (período, cards clicáveis, balanço, top 5 categorias)"`
- [ ] `git push origin main && npm run deploy`