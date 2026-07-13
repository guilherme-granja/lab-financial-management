import { format, subMonths, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BalanceLineChart } from '@/components/charts/BalanceLineChart'
import { TopCategoriesDonutChart } from '@/components/charts/TopCategoriesDonutChart'
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle, ChevronRight, ChevronLeft, ArrowLeftRight } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useProfile } from '@/hooks/useProfile'
import { useSelectedMonth } from '@/hooks/useSelectedMonth'
import { WelcomeBanner } from '@/components/dashboard/welcome-banner'

interface MonthSummary {
  income: number
  expenses: number
  balance: number
  pending: number
  investments: number
  transfers: number
  prevIncome: number
  prevExpenses: number
  prevBalance: number
  prevPending: number
}

function Delta({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0) return null
  const pct = Math.round(((curr - prev) / prev) * 100)
  const positive = pct >= 0
  return (
    <p className={`text-xs mt-1 ${positive ? 'text-green-500' : 'text-red-400'}`}>
      {positive ? '+' : ''}{pct}% vs mes anterior
    </p>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { month: selectedMonth, setMonth: setSelectedMonth } = useSelectedMonth()

  function navigatePeriod(delta: number) {
    setSelectedMonth(format(addMonths(parseISO(`${selectedMonth}-01`), delta), 'yyyy-MM'))
  }

  const period = selectedMonth
  const prevPeriod = format(subMonths(parseISO(`${selectedMonth}-01`), 1), 'yyyy-MM')

  const { summary: currSummary, lineData, donutData, recentTx, loading, unlinkedCount } = useDashboard(period)
  const { summary: prevSummary, loading: loadingPrev } = useDashboard(prevPeriod)
  const { name: profileName } = useProfile()
  const firstName = profileName.trim().split(' ')[0] || null

  const summary: MonthSummary = {
    income: currSummary.income,
    expenses: currSummary.expenses,
    balance: currSummary.balance,
    pending: currSummary.pending,
    investments: currSummary.investments,
    transfers: currSummary.transfers,
    prevIncome: prevSummary.income,
    prevExpenses: prevSummary.expenses,
    prevBalance: prevSummary.balance,
    prevPending: prevSummary.pending,
  }

  if (loading || loadingPrev) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {firstName && <WelcomeBanner name={firstName} />}

      {/* Month selector */}
      <div className="flex items-center gap-0.5 bg-[#1a1d27] border border-[#2d3148] rounded-lg h-9 px-1 w-fit">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
          onClick={() => navigatePeriod(-1)}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-slate-200 text-sm w-32 text-center capitalize select-none">
          {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?type=income&month=${period}&status=paid`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Receitas do mês</CardTitle>
            <TrendingUp size={18} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</p>
            <Delta curr={summary.income} prev={summary.prevIncome} />
          </CardContent>
        </Card>

        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?type=expense&month=${period}&status=paid`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Despesas do mês</CardTitle>
            <TrendingDown size={18} className="text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.expenses)}</p>
            <Delta curr={summary.expenses} prev={summary.prevExpenses} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Saldo do mês</CardTitle>
            <Wallet size={18} className="text-indigo-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.balance)}
            </p>
            <Delta curr={summary.balance} prev={summary.prevBalance} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?status=unpaid&month=${period}`)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">A pagar este mês</CardTitle>
            <Clock size={18} className="text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{formatCurrency(summary.pending)}</p>
            <Delta curr={summary.pending} prev={summary.prevPending} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Investimentos</CardTitle>
            <TrendingUp size={16} className="text-blue-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(summary.investments)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Transferências do mês</CardTitle>
            <ArrowLeftRight size={16} className="text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-300">{formatCurrency(summary.transfers)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unlinked transactions warning */}
      {unlinkedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {unlinkedCount === 1
              ? '1 transação deste mês não está vinculada a nenhuma conta e está sendo contabilizada no saldo acima.'
              : `${unlinkedCount} transações deste mês não estão vinculadas a nenhuma conta e estão sendo contabilizadas no saldo acima.`}
          </span>
          <button
            onClick={() => navigate('/transactions?account=none')}
            className="ml-auto shrink-0 underline underline-offset-2 hover:text-yellow-300"
          >
            Ver transações
          </button>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Evolucao mensal</CardTitle>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-200 text-sm font-medium">Transacoes recentes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200 gap-1.5 text-xs"
            onClick={() => navigate('/transactions')}
          >
            Ver todas as transacoes
            <ChevronRight size={14} />
          </Button>
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
