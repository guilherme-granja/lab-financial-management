import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/hooks/useCategories'
import type { Category } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import type { MonthlyDataPoint } from '@/components/charts/MonthlyBarChart'
import { Download } from 'lucide-react'

interface CategoryRow {
  name: string
  icon: string
  total: number
  percent: number
  type: 'income' | 'expense'
}

function buildMonthOptions() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i)
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    }
  })
}

export default function Reports() {
  const MONTH_OPTIONS = buildMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value)
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [barData, setBarData] = useState<MonthlyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const { categories } = useCategories()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date()

      // Monthly summary for selected month
      const [year, month] = selectedMonth.split('-')
      const start = `${year}-${month}-01`
      const refDate = new Date(Number(year), Number(month) - 1, 1)
      const end = format(endOfMonth(refDate), 'yyyy-MM-dd')

      const { data: txData } = await supabase
        .from('transactions')
        .select('amount, type, category_id, categories(name, icon, color)')
        .gte('date', start)
        .lte('date', end)

      const txs = txData ?? []

      const catMap: Record<string, CategoryRow> = {}
      for (const tx of txs) {
        const cat = tx.categories as unknown as Category | null
        const key = tx.category_id ?? '__none__'
        if (!catMap[key]) {
          catMap[key] = {
            name: cat?.name ?? 'Sem categoria',
            icon: cat?.icon ?? '❓',
            total: 0,
            percent: 0,
            type: tx.type as 'income' | 'expense',
          }
        }
        catMap[key].total += tx.amount
      }

      const grandTotal = txs.reduce((s, t) => s + t.amount, 0) || 1
      const rows = Object.values(catMap).map((r) => ({
        ...r,
        percent: (r.total / grandTotal) * 100,
      }))
      rows.sort((a, b) => b.total - a.total)
      setCategoryRows(rows)

      // Bar chart — last 6 months
      const monthsData = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i)
          const s = format(startOfMonth(d), 'yyyy-MM-dd')
          const e = format(endOfMonth(d), 'yyyy-MM-dd')
          return supabase
            .from('transactions')
            .select('amount, type')
            .gte('date', s)
            .lte('date', e)
            .then(({ data }) => ({
              month: format(d, 'MMM/yy', { locale: ptBR }),
              receitas: (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
              despesas: (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            }))
        })
      )
      setBarData(monthsData)
      setLoading(false)
    }

    load()
  }, [selectedMonth, categories])

  function exportCSV() {
    const header = 'Categoria,Tipo,Total,Percentual'
    const rows = categoryRows.map(
      (r) =>
        `"${r.icon} ${r.name}","${r.type === 'income' ? 'Receita' : 'Despesa'}","${r.total.toFixed(2)}","${r.percent.toFixed(1)}%"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Mês</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="capitalize">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={exportCSV} className="border-[#2d3148] text-slate-400 hover:text-slate-200 gap-2">
          <Download size={15} />
          Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="bg-[#1a1d27] border border-[#2d3148]">
          <TabsTrigger value="summary" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="chart" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
            Gráfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="bg-[#1a1d27] border-[#2d3148]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2d3148] hover:bg-transparent">
                    <TableHead className="text-slate-400">Categoria</TableHead>
                    <TableHead className="text-slate-400">Tipo</TableHead>
                    <TableHead className="text-slate-400 text-right">Total</TableHead>
                    <TableHead className="text-slate-400 text-right">% do total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && categoryRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Nenhum dado no período
                      </TableCell>
                    </TableRow>
                  )}
                  {categoryRows.map((row, i) => (
                    <TableRow key={i} className="border-[#2d3148]">
                      <TableCell className="text-slate-300">
                        {row.icon} {row.name}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {row.type === 'income' ? 'Receita' : 'Despesa'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${row.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {row.percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card className="bg-[#1a1d27] border-[#2d3148]">
            <CardHeader>
              <CardTitle className="text-slate-200 text-sm font-medium">
                Receitas vs Despesas — últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyBarChart data={barData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
