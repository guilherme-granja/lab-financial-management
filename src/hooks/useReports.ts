import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSupabaseClient } from '@/hooks/useDatabase'
import type { MonthlyDataPoint } from '@/components/charts/MonthlyBarChart'
import type { Category } from '@/types'

export interface CategoryRow {
  category_id: string | null
  name: string
  icon: string
  total: number
  percent: number
  type: 'income' | 'expense'
}

interface ReportsData {
  categoryRows: CategoryRow[]
  barData: MonthlyDataPoint[]
  loading: boolean
}

export function useReports(selectedMonth: string): ReportsData {
  const supabase = useSupabaseClient()
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [barData, setBarData] = useState<MonthlyDataPoint[]>([])
  const [loading, setLoading] = useState(true)

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
        .eq('paid', true)
        .neq('type', 'transfer')

      const txs = txData ?? []

      const catMap: Record<string, CategoryRow> = {}
      for (const tx of txs) {
        const cat = tx.categories as unknown as Category | null
        const key = tx.category_id ?? '__none__'
        if (!catMap[key]) {
          catMap[key] = {
            category_id: tx.category_id,
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
            .eq('paid', true)
            .neq('type', 'transfer')
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
  }, [selectedMonth, supabase])

  return { categoryRows, barData, loading }
}
