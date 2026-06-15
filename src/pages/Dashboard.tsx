import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import type { Transaction, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BalanceLineChart } from '@/components/charts/BalanceLineChart'
import type { BalanceDataPoint } from '@/components/charts/BalanceLineChart'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import type { PieDataPoint } from '@/components/charts/ExpensePieChart'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface MonthSummary {
  income: number
  expenses: number
  balance: number
}

export default function Dashboard() {
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expenses: 0, balance: 0 })
  const [lineData, setLineData] = useState<BalanceDataPoint[]>([])
  const [pieData, setPieData] = useState<PieDataPoint[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

      const [summaryRes, pieRes, recentRes, historyData] = await Promise.all([
        // Current month totals
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', monthStart)
          .lte('date', monthEnd),

        // Expenses by category this month
        supabase
          .from('transactions')
          .select('amount, categories(name, color)')
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd),

        // 5 most recent transactions
        supabase
          .from('transactions')
          .select('*, categories(*)')
          .order('date', { ascending: false })
          .limit(5),

        // Last 6 months history
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
              .then(({ data }) => ({
                month: format(d, 'MMM/yy', { locale: ptBR }),
                data: data ?? [],
              }))
          })
        ),
      ])

      // Summary
      const txs = summaryRes.data ?? []
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      setSummary({ income, expenses, balance: income - expenses })

      // Pie chart — group by category
      const catMap: Record<string, { name: string; color: string; total: number }> = {}
      for (const tx of pieRes.data ?? []) {
        const cat = tx.categories as unknown as Category | null
        const key = cat?.name ?? 'Sem categoria'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#6366f1', total: 0 }
        catMap[key].total += tx.amount
      }
      setPieData(Object.values(catMap).map((c) => ({ name: c.name, value: c.total, color: c.color })))

      // Recent transactions
      setRecentTx((recentRes.data as Transaction[]) ?? [])

      // Line chart
      setLineData(
        historyData.map(({ month, data }) => {
          const inc = data.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
          const exp = data.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
          return { month, balance: inc - exp }
        })
      )

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Receitas do mês</CardTitle>
            <TrendingUp size={16} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Saldo — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceLineChart data={lineData} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensePieChart data={pieData} />
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
                      className={tx.type === 'income'
                        ? 'bg-green-950 text-green-400 border-green-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                      }
                      variant="outline"
                    >
                      {tx.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
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
