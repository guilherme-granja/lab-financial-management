import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionType, RecurrenceType } from '@/types'

export interface TransactionFilters {
  period: string
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string
  status: 'all' | 'paid' | 'unpaid'
}

export interface TransactionPayload {
  amount: number
  type: TransactionType
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  description: string | null
  date: string
  recurrence: RecurrenceType
  installments: number | null
  paid: boolean
  paid_at: string | null
  paid_amount: number | null
}

const PAGE_SIZE = 20

const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*)'

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
      .select(SELECT_FIELDS, { count: 'exact' })
      .like('date', datePattern)
      .order('date', { ascending: false })
      .range(from, to)

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters.status === 'paid') {
      query = query.eq('paid', true)
    } else if (filters.status === 'unpaid') {
      query = query.eq('paid', false)
    }

    const { data, error: err, count } = await query

    if (err) {
      setError(err.message)
    } else {
      setTransactions((data as unknown as Transaction[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    setPage(1)
  }, [filters])

  async function createTransaction(payload: TransactionPayload) {
    const currentMonth = format(new Date(), 'yyyy-MM')

    if (payload.recurrence === 'installment' && payload.installments && payload.installments > 1) {
      const groupId = crypto.randomUUID()
      const n = payload.installments
      const records = Array.from({ length: n }, (_, i) => {
        const date = format(addMonths(parseISO(payload.date), i), 'yyyy-MM-dd')
        const desc = payload.description
          ? `${payload.description} (${i + 1}/${n})`
          : `(${i + 1}/${n})`
        const isPaid = date.startsWith(currentMonth) ? payload.paid : false
        return {
          amount: payload.amount,
          type: payload.type,
          category_id: payload.category_id,
          account_id: payload.account_id,
          to_account_id: payload.to_account_id,
          description: desc,
          date,
          recurrence: 'installment' as RecurrenceType,
          installments: n,
          installment_index: i + 1,
          recurrence_group_id: groupId,
          paid: isPaid,
          paid_at: isPaid ? payload.paid_at : null,
          paid_amount: isPaid ? payload.paid_amount : null,
        }
      })
      const { error: err } = await supabase.from('transactions').insert(records)
      if (err) throw new Error(err.message)
      await fetch()
      return
    }

    if (payload.recurrence === 'fixed') {
      const groupId = crypto.randomUUID()
      const n = 24
      const records = Array.from({ length: n }, (_, i) => {
        const date = format(addMonths(parseISO(payload.date), i), 'yyyy-MM-dd')
        const isPaid = date.startsWith(currentMonth) ? payload.paid : false
        return {
          amount: payload.amount,
          type: payload.type,
          category_id: payload.category_id,
          account_id: payload.account_id,
          to_account_id: payload.to_account_id,
          description: payload.description,
          date,
          recurrence: 'fixed' as RecurrenceType,
          installments: n,
          installment_index: i + 1,
          recurrence_group_id: groupId,
          paid: isPaid,
          paid_at: isPaid ? payload.paid_at : null,
          paid_amount: isPaid ? payload.paid_amount : null,
        }
      })
      const { error: err } = await supabase.from('transactions').insert(records)
      if (err) throw new Error(err.message)
      await fetch()
      return
    }

    const { error: err } = await supabase.from('transactions').insert({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      account_id: payload.account_id,
      to_account_id: payload.to_account_id,
      description: payload.description,
      date: payload.date,
      recurrence: payload.recurrence,
      installments: payload.installments,
      installment_index: null,
      recurrence_group_id: null,
      paid: payload.paid,
      paid_at: payload.paid_at,
      paid_amount: payload.paid_amount,
    })
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function updateTransaction(id: string, payload: Partial<TransactionPayload>) {
    const { error: err } = await supabase.from('transactions').update(payload).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function updateTransactionPayment(id: string, paid_at: string, paid_amount: number) {
    const { error: err } = await supabase
      .from('transactions')
      .update({ paid: true, paid_at, paid_amount })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function deleteTransaction(id: string) {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id)
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
    updateTransactionPayment,
    deleteTransaction,
  }
}
