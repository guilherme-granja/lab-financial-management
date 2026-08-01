import { useState, useEffect, useCallback } from 'react'
import { format, endOfMonth, parseISO } from 'date-fns'
import { useSupabaseClient } from '@/hooks/useDatabase'
import type { MonthlyBudget, BudgetPreset, BudgetSummary, BudgetStatus } from '@/types'

export interface BudgetConfigPayload {
  preset: BudgetPreset | null
  needs_pct: number
  leisure_pct: number
  savings_pct: number
}

export function calculateStatus(realPct: number, targetPct: number | null, mode: 'normal' | 'inverse'): BudgetStatus {
  if (targetPct === null || targetPct === 0) return 'neutro'
  const ratio = realPct / targetPct
  if (mode === 'normal') {
    if (ratio <= 0.5) return 'verde'
    if (ratio <= 1) return 'amarelo'
    return 'vermelho'
  }
  if (ratio >= 1) return 'verde'
  if (ratio >= 0.5) return 'amarelo'
  return 'vermelho'
}

export function useBudgets(month: string) {
  const supabase = useSupabaseClient()
  const [budgetConfig, setBudgetConfig] = useState<MonthlyBudget | null>(null)
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: configData, error: configErr } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('month', month)
      .maybeSingle()

    if (configErr) {
      setError(configErr.message)
      setBudgetConfig(null)
      setSummary(null)
      setLoading(false)
      return
    }

    const config = (configData as MonthlyBudget | null) ?? null
    setBudgetConfig(config)

    if (!config) {
      setSummary(null)
      setLoading(false)
      return
    }

    const monthStart = `${month}-01`
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd')

    const [incomeRes, expenseRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, apply_budget')
        .eq('type', 'income')
        .eq('paid', true)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase
        .from('transactions')
        .select('amount, budget_bucket')
        .eq('type', 'expense')
        .eq('paid', true)
        .gte('date', monthStart)
        .lte('date', monthEnd),
    ])

    if (incomeRes.error) {
      setError(incomeRes.error.message)
      setSummary(null)
      setLoading(false)
      return
    }
    if (expenseRes.error) {
      setError(expenseRes.error.message)
      setSummary(null)
      setLoading(false)
      return
    }

    const incomeRows = (incomeRes.data ?? []) as { amount: number; apply_budget: boolean }[]
    const expenseRows = (expenseRes.data ?? []) as { amount: number; budget_bucket: 'needs' | 'leisure' | null }[]

    const base = incomeRows
      .filter((t) => t.apply_budget)
      .reduce((s, t) => s + Number(t.amount), 0)

    const unflaggedIncome = incomeRows.filter((t) => !t.apply_budget)
    const unflaggedIncomeCount = unflaggedIncome.length
    const unflaggedIncomeAmount = unflaggedIncome.reduce((s, t) => s + Number(t.amount), 0)

    const needsRows = expenseRows.filter((t) => t.budget_bucket === 'needs')
    const leisureRows = expenseRows.filter((t) => t.budget_bucket === 'leisure')
    const unclassifiedRows = expenseRows.filter((t) => t.budget_bucket === null)

    const needsAmount = needsRows.reduce((s, t) => s + Number(t.amount), 0)
    const leisureAmount = leisureRows.reduce((s, t) => s + Number(t.amount), 0)
    const unclassifiedAmount = unclassifiedRows.reduce((s, t) => s + Number(t.amount), 0)
    const savingsAmount = base - needsAmount - leisureAmount - unclassifiedAmount

    const needsPct = base > 0 ? (needsAmount / base) * 100 : 0
    const leisurePct = base > 0 ? (leisureAmount / base) * 100 : 0
    const unclassifiedPct = base > 0 ? (unclassifiedAmount / base) * 100 : 0
    const savingsPct = base > 0 ? (savingsAmount / base) * 100 : 0

    setSummary({
      month,
      base,
      needs: {
        amount: needsAmount,
        pct: needsPct,
        targetPct: config.needs_pct,
        status: calculateStatus(needsPct, config.needs_pct, 'normal'),
      },
      leisure: {
        amount: leisureAmount,
        pct: leisurePct,
        targetPct: config.leisure_pct,
        status: calculateStatus(leisurePct, config.leisure_pct, 'normal'),
      },
      unclassified: {
        amount: unclassifiedAmount,
        pct: unclassifiedPct,
        targetPct: null,
        status: 'neutro',
      },
      savings: {
        amount: savingsAmount,
        pct: savingsPct,
        targetPct: config.savings_pct,
        status: calculateStatus(savingsPct, config.savings_pct, 'inverse'),
      },
      unclassifiedExpenseCount: unclassifiedRows.length,
      unflaggedIncomeCount,
      unflaggedIncomeAmount,
    })
    setLoading(false)
  }, [month, supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  async function upsertBudgetConfig(month: string, payload: BudgetConfigPayload) {
    const { error: err } = await supabase
      .from('monthly_budgets')
      .upsert({ month, ...payload }, { onConflict: 'month' })
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    budgetConfig,
    summary,
    loading,
    error,
    refresh: fetch,
    upsertBudgetConfig,
  }
}
