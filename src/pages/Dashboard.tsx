import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BalanceLineChart } from '@/components/charts/BalanceLineChart'
import { TopCategoriesDonutChart } from '@/components/charts/TopCategoriesDonutChart'
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle } from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'
import { useSelectedMonth } from '@/components/layout/PageWrapper'

export default function Dashboard() {
  const navigate = useNavigate()
  const { selectedMonth } = useSelectedMonth()

  // período no formato 'yyyy-MM' derivado do mês selecionado no Header
  const period = format(selectedMonth, 'yyyy-MM')

  const { summary, lineData, donutData, recentTx, loading, unlinkedCount } = useDashboard(period)

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-indigo-600/50 transition-colors"
          onClick={() => navigate(`/transactions?type=income&month=${period}&status=paid`)}
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
          onClick={() => navigate(`/transactions?type=expense&month=${period}&status=paid`)}
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
