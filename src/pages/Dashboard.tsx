import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BalanceLineChart } from '@/components/charts/BalanceLineChart'
import type { BalanceDataPoint } from '@/components/charts/BalanceLineChart'
import { TopCategoriesDonutChart } from '@/components/charts/TopCategoriesDonutChart'
import type { DonutDataPoint } from '@/components/charts/TopCategoriesDonutChart'
import { TrendingUp, TrendingDown, Wallet, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSummary {
  income: number
  expenses: number
  balance: number
  pending: number
}

const DONUT_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4']

export default function Dashboard() {
  const navigate = useNavigate()

  // período selecionado no formato 'yyyy-MM'; inicia sempre no mês corrente
  const [period, setPeriod] = useState<string>(format(new Date(), 'yyyy-MM'))

  function navigatePeriod(delta: number) {
    setPeriod((prev) => {
      const current = parseISO(`${prev}-01`)
      return format(addMonths(current, delta), 'yyyy-MM')
    })
  }

  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expenses: 0, balance: 0, pending: 0 })
  const [lineData, setLineData] = useState<BalanceDataPoint[]>([])
  const [donutData, setDonutData] = useState<DonutDataPoint[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const periodDate = parseISO(`${period}-01`)
      const monthStart = format(startOfMonth(periodDate), 'yyyy-MM-dd')
      const monthEnd   = format(endOfMonth(periodDate), 'yyyy-MM-dd')

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id')
        .eq('include_in_dashboard', true)

      const dashboardIds: string[] = (accountsData ?? []).map((a: { id: string }) => a.id)

      function accountFilter() {
        if (dashboardIds.length === 0) return 'account_id.is.null'
        return `account_id.is.null,account_id.in.(${dashboardIds.join(',')})`
      }

      const [summaryRes, pieRes, recentRes, historyData, pendingRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('paid', true)
          .neq('type', 'transfer')
          .or(accountFilter()),

        supabase
          .from('transactions')
          .select('amount, categories(id, name, parent_id)')
          .eq('type', 'expense')
          .eq('paid', true)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .or(accountFilter()),

        supabase
          .from('transactions')
          .select('*, categories(*), accounts!account_id(*)')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date', { ascending: false })
          .limit(5),

        Promise.all(
          Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(now, 5 - i)
            const start = format(startOfMonth(d), 'yyyy-MM-dd')
            const end = format(endOfMonth(d), 'yyyy-MM-dd')
            return supabase
              .from('transactions')
              .select('amount, type')
              .gte('date', start)
              .lte('date', end)
              .eq('paid', true)
              .neq('type', 'transfer')
              .or(accountFilter())
              .then(({ data }) => ({
                month: format(d, 'MMM/yy', { locale: ptBR }),
                data: data ?? [],
              }))
          })
        ),

        supabase
          .from('transactions')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('paid', false)
          .neq('type', 'transfer')
          .or(accountFilter()),
      ])

      const txs = summaryRes.data ?? []
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const pending = (pendingRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
      setSummary({ income, expenses, balance: income - expenses, pending })

      const catMap: Record<string, { name: string; total: number }> = {}
      for (const tx of pieRes.data ?? []) {
        const cat = tx.categories as unknown as {
          id: string; name: string; parent_id: string | null
        } | null
        const key   = cat?.id   ?? 'no-category'
        const label = cat?.name ?? 'Sem categoria'
        if (!catMap[key]) catMap[key] = { name: label, total: 0 }
        catMap[key].total += Number(tx.amount)
      }

      const top5 = Object.values(catMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((c, i) => ({ name: c.name, value: c.total, color: DONUT_COLORS[i] }))

      setDonutData(top5)

      setRecentTx((recentRes.data as unknown as Transaction[]) ?? [])

      setLineData(
        historyData.map(({ month, data }) => {
          const income  = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
          const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
          return { month, income, expense }
        })
      )

      setLoading(false)
    }

    load()
  }, [period])

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?type=income&month=${period}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Receitas do mês</CardTitle>
            <TrendingUp size={16} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?type=expense&month=${period}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Despesas do mês</CardTitle>
            <TrendingDown size={16} className="text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.expenses)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Saldo do mês</CardTitle>
            <Wallet size={16} className="text-indigo-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?status=unpaid&month=${period}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">A pagar este mês</CardTitle>
            <Clock size={16} className="text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{formatCurrency(summary.pending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Balanço — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceLineChart data={lineData} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Top 5 subcategorias — despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <TopCategoriesDonutChart data={donutData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-[#1a1d27] border-[#2d3148]">
        <CardHeader>
          <CardTitle className="text-slate-200 text-sm font-medium">Transações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148] hover:bg-transparent">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Tipo</TableHead>
                <TableHead className="text-slate-400 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              )}
              {recentTx.map((tx) => (
                <TableRow key={tx.id} className="border-[#2d3148]">
                  <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                  <TableCell className="text-slate-300">{tx.description ?? '—'}</TableCell>
                  <TableCell className="text-slate-300">
                    {tx.categories ? (
                      <span className="flex items-center gap-1.5">
                        <span>{tx.categories.icon}</span>
                        {tx.categories.name}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tx.type === 'income'
                          ? 'bg-green-950 text-green-400 border-green-800'
                          : tx.type === 'transfer'
                          ? 'bg-blue-950 text-blue-400 border-blue-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }
                      variant="outline"
                    >
                      {tx.type === 'income' ? 'Receita' : tx.type === 'transfer' ? 'Transferência' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      tx.type === 'income'
                        ? 'text-green-500'
                        : tx.type === 'transfer'
                        ? 'text-blue-400'
                        : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
