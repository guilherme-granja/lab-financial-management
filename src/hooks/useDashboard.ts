import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSupabaseClient } from '@/hooks/useDatabase'
import { useAccounts } from '@/hooks/useAccounts'
import type { Transaction } from '@/types'
import type { BalanceDataPoint } from '@/components/charts/BalanceLineChart'
import type { DonutDataPoint } from '@/components/charts/TopCategoriesDonutChart'

interface DashboardData {
  summary: { income: number; expenses: number; balance: number; pending: number; investments: number; transfers: number }
  lineData: BalanceDataPoint[]
  donutData: DonutDataPoint[]
  recentTx: Transaction[]
  loading: boolean
  unlinkedCount: number
}

const DONUT_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4']

export function useDashboard(period: string): DashboardData {
  const supabase = useSupabaseClient()
  const { getAccountBalance } = useAccounts()
  const [summary, setSummary] = useState<DashboardData['summary']>({ income: 0, expenses: 0, balance: 0, pending: 0, investments: 0, transfers: 0 })
  const [lineData, setLineData] = useState<BalanceDataPoint[]>([])
  const [donutData, setDonutData] = useState<DonutDataPoint[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [unlinkedCount, setUnlinkedCount] = useState(0)

  useEffect(() => {
    async function load() {
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

      const [summaryRes, pieRes, recentRes, historyData, pendingRes, unlinkedRes, transfersRes, investmentAccountsRes] = await Promise.all([
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
            const d = subMonths(periodDate, 5 - i)
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
          .eq('type', 'expense')
          .or(accountFilter()),

        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .neq('type', 'transfer')
          .eq('paid', true)
          .is('account_id', null),

        supabase
          .from('transactions')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('type', 'transfer'),

        supabase
          .from('accounts')
          .select('id, initial_balance')
          .eq('type', 'investment'),
      ])

      const txs = summaryRes.data ?? []
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const pending = (pendingRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
      const transfers = (transfersRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

      const investmentAccounts = (investmentAccountsRes.data ?? []) as Array<{ id: string; initial_balance: number }>
      const investmentBalances = await Promise.all(
        investmentAccounts.map((a) => getAccountBalance(a.id, a.initial_balance))
      )
      const investments = investmentBalances.reduce((s, b) => s + b, 0)

      setSummary({ income, expenses, balance: income - expenses - investments, pending, investments, transfers })

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
          const receitas = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
          const despesas = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
          return { month, receitas, despesas }
        })
      )

      setUnlinkedCount(unlinkedRes.count ?? 0)

      setLoading(false)
    }

    load()
  }, [period, supabase])

  return { summary, lineData, donutData, recentTx, loading, unlinkedCount }
}
