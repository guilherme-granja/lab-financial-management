import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Goal, GoalWithProgress, PeriodType } from '@/types'

export function useGoals() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)

    const { data: goalsData, error: goalsErr } = await supabase
      .from('goals')
      .select('*, categories(*)')
      .order('created_at', { ascending: false })

    if (goalsErr) {
      setError(goalsErr.message)
      setLoading(false)
      return
    }

    const rawGoals = (goalsData as Goal[]) ?? []

    const withProgress = await Promise.all(
      rawGoals.map(async (goal) => {
        const datePattern =
          goal.period_type === 'monthly'
            ? `${goal.period_start}-%`
            : `${goal.period_start.slice(0, 4)}%`

        const { data: txData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', goal.category_id)
          .eq('type', 'expense')
          .like('date', datePattern)

        const actual = (txData ?? []).reduce((sum, tx) => sum + (tx.amount as number), 0)
        const progress = goal.amount > 0 ? (actual / goal.amount) * 100 : 0

        return { ...goal, actual, progress }
      })
    )

    setGoals(withProgress)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createGoal = async (payload: {
    category_id: string
    amount: number
    period_type: PeriodType
    period_start: string
  }) => {
    const { error: err } = await supabase.from('goals').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateGoal = async (
    id: string,
    payload: Partial<{
      category_id: string
      amount: number
      period_type: PeriodType
      period_start: string
    }>
  ) => {
    const { error: err } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteGoal = async (id: string) => {
    const { error: err } = await supabase.from('goals').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    goals,
    loading,
    error,
    refresh: fetch,
    createGoal,
    updateGoal,
    deleteGoal,
  }
}
