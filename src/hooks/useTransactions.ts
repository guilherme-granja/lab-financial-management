import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, TransactionType } from '@/types'

export interface TransactionFilters {
  period: string        // 'YYYY-MM' for monthly or 'YYYY' for yearly
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string    // uuid or 'all'
}

const PAGE_SIZE = 20

export function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const datePattern =
      filters.periodType === 'monthly'
        ? `${filters.period}-%`
        : `${filters.period}%`

    let query = supabase
      .from('transactions')
      .select('*, categories(*)', { count: 'exact' })
      .like('date', datePattern)
      .order('date', { ascending: false })
      .range(from, to)

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }

    const { data, error: err, count } = await query

    if (err) {
      setError(err.message)
    } else {
      setTransactions((data as Transaction[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createTransaction = async (
    payload: Omit<Transaction, 'id' | 'created_at' | 'categories'>
  ) => {
    const { error: err } = await supabase.from('transactions').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateTransaction = async (
    id: string,
    payload: Partial<Omit<Transaction, 'id' | 'created_at' | 'categories'>>
  ) => {
    const { error: err } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteTransaction = async (id: string) => {
    const { error: err } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    transactions,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    refresh: fetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
