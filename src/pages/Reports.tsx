import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCategories } from '@/hooks/useCategories'
import { useReports } from '@/hooks/useReports'
import { formatCurrency } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { Download } from 'lucide-react'

interface CategoryRow {
  category_id: string | null
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
  const [groupByParent, setGroupByParent] = useState(true)
  const { categoryTree } = useCategories()
  const { categoryRows, barData, loading } = useReports(selectedMonth)

  const displayRows = useMemo(() => {
    if (!groupByParent) return categoryRows

    const parentMap: Record<string, { category_id: string | null; name: string; icon: string; total: number; type: 'income' | 'expense' }> = {}

    for (const row of categoryRows) {
      const parent = categoryTree.find((p) =>
        p.subcategories?.some((s) => s.id === row.category_id)
      ) ?? null

      const key = parent ? parent.id : (row.category_id ?? '__none__')
      const displayName = parent ? parent.name : row.name
      const displayIcon = parent ? parent.icon : row.icon

      if (!parentMap[key]) {
        parentMap[key] = { category_id: parent?.id ?? row.category_id, name: displayName, icon: displayIcon, total: 0, type: row.type }
      }
      parentMap[key].total += row.total
    }

    const grandTotal = Object.values(parentMap).reduce((s, r) => s + r.total, 0) || 1
    return Object.values(parentMap)
      .map((r) => ({ ...r, percent: (r.total / grandTotal) * 100 }))
      .sort((a, b) => b.total - a.total)
  }, [categoryRows, groupByParent, categoryTree])

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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-slate-400 text-xs">Agrupar por:</span>
            <button
              onClick={() => setGroupByParent(true)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                groupByParent
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-slate-400 border-[#2d3148] hover:text-slate-200'
              }`}
            >
              Grupo
            </button>
            <button
              onClick={() => setGroupByParent(false)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !groupByParent
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-slate-400 border-[#2d3148] hover:text-slate-200'
              }`}
            >
              Subcategoria
            </button>
          </div>
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
                  {!loading && displayRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Nenhum dado no período
                      </TableCell>
                    </TableRow>
                  )}
                  {displayRows.map((row, i) => (
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
