import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { useSupabaseClient } from '@/hooks/useDatabase'
import { useAuth } from '@/hooks/useAuth'
import { setTransactionTagsStandalone } from '@/hooks/useTags'
import { logActivity } from '@/lib/activity-log'
import type { Transaction, TransactionType, RecurrenceType } from '@/types'

export interface TransactionFilters {
  period: string
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string
  status: 'all' | 'paid' | 'unpaid'
  account_id: string | null
  tagId: string
  dateFrom: string | null
  dateTo: string | null
  unpaginated?: boolean
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
  tag_id?: string | null
  tag_ids?: string[]
}

const PAGE_SIZE = 20

const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*), transaction_tags(*, tags(*)), recurrence_groups(*), payment:transaction_payments(*)'

export function useTransactions(filters: TransactionFilters) {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFilteredTotal(null)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const [dateStart, dateEnd]: [string, string] = (() => {
      const base: [string, string] = filters.periodType === 'monthly'
        ? (() => {
            const [year, month] = filters.period.split('-').map(Number)
            const ref = new Date(year, month - 1, 1)
            return [format(startOfMonth(ref), 'yyyy-MM-dd'), format(endOfMonth(ref), 'yyyy-MM-dd')]
          })()
        : (() => {
            const ref = new Date(Number(filters.period), 0, 1)
            return [format(startOfYear(ref), 'yyyy-MM-dd'), format(endOfYear(ref), 'yyyy-MM-dd')]
          })()

      const start = filters.dateFrom ?? base[0]
      const end = filters.dateTo ?? base[1]
      return [start, end]
    })()

    let query = supabase
      .from('transactions')
      .select(SELECT_FIELDS, { count: 'exact' })
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('date', { ascending: false })

    if (!filters.unpaginated) {
      query = query.range(from, to)
    }

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
    if (filters.account_id) {
      query = query.eq('account_id', filters.account_id)
    }
    if (filters.tagId !== 'all') {
      query = query.eq('tag_id', filters.tagId)
    }

    // Sum query — only runs when type filter is active
    let sumQuery: Promise<{ data: { amount: number }[] | null; error: unknown }> | null = null
    if (filters.type !== 'all') {
      let sq = supabase
        .from('transactions')
        .select('amount')
        .gte('date', dateStart)
        .lte('date', dateEnd)

      sq = sq.eq('type', filters.type)
      sq = sq.neq('type', 'transfer')
      if (filters.categoryId !== 'all') {
        sq = sq.eq('category_id', filters.categoryId)
      }
      if (filters.status === 'paid') {
        sq = sq.eq('paid', true)
      } else if (filters.status === 'unpaid') {
        sq = sq.eq('paid', false)
      }
      if (filters.account_id) {
        sq = sq.eq('account_id', filters.account_id)
      }
      if (filters.tagId !== 'all') {
        sq = sq.eq('tag_id', filters.tagId)
      }

      sumQuery = sq.then(({ data, error }) => ({ data: data as { amount: number }[] | null, error }))
    }

    const [{ data, error: err, count }, sumResult] = await Promise.all([
      query,
      sumQuery ?? Promise.resolve({ data: null, error: null }),
    ])

    if (err) {
      setError(err.message)
    } else {
      setTransactions((data as unknown as Transaction[]) ?? [])
      setTotal(count ?? 0)
    }

    if (filters.type !== 'all' && sumResult.data) {
      setFilteredTotal(sumResult.data.reduce((acc, tx) => acc + tx.amount, 0))
    } else {
      setFilteredTotal(null)
    }

    setLoading(false)
  }, [filters, page, supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    setPage(1)
  }, [filters])

  async function createTransaction(payload: TransactionPayload) {
    const currentMonth = format(new Date(), 'yyyy-MM')

    if (payload.recurrence === 'installment' && payload.installments && payload.installments > 1) {
      const n = payload.installments
      const { data: groupData, error: groupErr } = await supabase
        .from('recurrence_groups')
        .insert({
          recurrence_type: 'installment',
          total_installments: n,
          description_template: payload.description,
          starts_at: payload.date,
        })
        .select('id')
        .single()
      if (groupErr) throw new Error(groupErr.message)
      const groupId = groupData.id
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
          tag_id: (payload.tag_ids ?? [])[0] ?? null,
        }
      })
      const { data: insertedRows, error: err } = await supabase
        .from('transactions')
        .insert(records)
        .select('id')
      if (err) {
        await supabase.from('recurrence_groups').delete().eq('id', groupId)
        throw new Error(err.message)
      }
      const insertedIds = (insertedRows ?? []).map((r) => r.id as string)
      const paidInstallments = records
        .map((r, i) => ({ r, id: insertedIds[i] }))
        .filter(({ r }) => r.paid && r.paid_at != null && r.paid_amount != null)
      if (paidInstallments.length > 0) {
        const { error: payErr1 } = await supabase.from('transaction_payments').insert(
          paidInstallments.map(({ r, id }) => ({
            transaction_id: id,
            paid_at: r.paid_at,
            paid_amount: r.paid_amount,
          }))
        )
        if (payErr1) throw new Error(payErr1.message)
      }
      if (user) logActivity(user.id, 'transaction_created', { recurrence_group_id: groupId })
      await fetch()
      return
    }

    if (payload.recurrence === 'fixed') {
      const n = 24
      const { data: groupData, error: groupErr } = await supabase
        .from('recurrence_groups')
        .insert({
          recurrence_type: 'fixed',
          total_installments: n,
          description_template: payload.description,
          starts_at: payload.date,
        })
        .select('id')
        .single()
      if (groupErr) throw new Error(groupErr.message)
      const groupId = groupData.id
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
          tag_id: (payload.tag_ids ?? [])[0] ?? null,
        }
      })
      const { data: insertedRows, error: err } = await supabase
        .from('transactions')
        .insert(records)
        .select('id')
      if (err) {
        await supabase.from('recurrence_groups').delete().eq('id', groupId)
        throw new Error(err.message)
      }
      const insertedIds = (insertedRows ?? []).map((r) => r.id as string)
      const paidFixed = records
        .map((r, i) => ({ r, id: insertedIds[i] }))
        .filter(({ r }) => r.paid && r.paid_at != null && r.paid_amount != null)
      if (paidFixed.length > 0) {
        const { error: payErr2 } = await supabase.from('transaction_payments').insert(
          paidFixed.map(({ r, id }) => ({
            transaction_id: id,
            paid_at: r.paid_at,
            paid_amount: r.paid_amount,
          }))
        )
        if (payErr2) throw new Error(payErr2.message)
      }
      if (user) logActivity(user.id, 'transaction_created', { recurrence_group_id: groupId })
      await fetch()
      return
    }

    const { data: inserted, error: err } = await supabase.from('transactions').insert({
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
      tag_id: (payload.tag_ids ?? [])[0] ?? null,
    }).select('id').single()
    if (err) throw new Error(err.message)
    if (payload.paid && payload.paid_at != null && payload.paid_amount != null) {
      const { error: payErr3 } = await supabase.from('transaction_payments').insert({
        transaction_id: inserted.id,
        paid_at: payload.paid_at,
        paid_amount: payload.paid_amount,
      })
      if (payErr3) throw new Error(payErr3.message)
    }
    if ((payload.tag_ids ?? []).length > 0) {
      await setTransactionTagsStandalone(supabase, inserted.id, payload.tag_ids ?? [])
    }
    if (user) logActivity(user.id, 'transaction_created', { transaction_id: inserted.id })
    await fetch()
  }

  async function updateTransaction(id: string, payload: Partial<TransactionPayload>) {
    const { tag_ids, ...dbPayload } = payload
    dbPayload.tag_id = (tag_ids ?? [])[0] ?? null
    const { error: err } = await supabase.from('transactions').update(dbPayload).eq('id', id)
    if (err) throw new Error(err.message)
    await setTransactionTagsStandalone(supabase, id, tag_ids ?? [])
    if (user) logActivity(user.id, 'transaction_updated', { transaction_id: id })
    await fetch()
  }

  async function updateRecurrenceGroup(
    groupId: string,
    payload: Partial<TransactionPayload>
  ) {
    const { date: _date, tag_ids: _tag_ids, ...rest } = payload as TransactionPayload & { date?: string }
    const { error: err } = await supabase
      .from('transactions')
      .update(rest)
      .eq('recurrence_group_id', groupId)
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function updateRecurrenceFromHere(
    id: string,
    groupId: string,
    fromDate: string,
    payload: Partial<TransactionPayload>
  ) {
    const { date: _date, tag_ids: _tag_ids, ...rest } = payload as TransactionPayload & { date?: string }

    const { error: e1 } = await supabase
      .from('transactions')
      .update(rest)
      .eq('id', id)
    if (e1) throw new Error(e1.message)

    const { error: e2 } = await supabase
      .from('transactions')
      .update(rest)
      .eq('recurrence_group_id', groupId)
      .gte('date', fromDate)
      .eq('paid', false)
      .neq('id', id)
    if (e2) throw new Error(e2.message)

    await fetch()
  }

  async function updateTransactionPayment(id: string, paid_at: string, paid_amount: number): Promise<void> {
    const { error: err } = await supabase
      .from('transaction_payments')
      .upsert({ transaction_id: id, paid_at, paid_amount }, { onConflict: 'transaction_id' })
    if (err) throw new Error(err.message)
    // Update legacy columns for rollback compatibility
    await supabase
      .from('transactions')
      .update({ paid: true, paid_at, paid_amount, amount: paid_amount, date: paid_at })
      .eq('id', id)
    await fetch()
  }

  async function unefetivateTransaction(id: string): Promise<void> {
    const { error: err } = await supabase.from('transaction_payments').delete().eq('transaction_id', id)
    if (err) throw new Error(err.message)
    // Clear legacy columns
    await supabase
      .from('transactions')
      .update({ paid_at: null, paid_amount: null })
      .eq('id', id)
    await fetch()
  }

  async function deleteTransaction(id: string) {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id)
    if (err) throw new Error(err.message)
    if (user) logActivity(user.id, 'transaction_deleted', { transaction_id: id })
    await fetch()
  }

  async function deleteTransactionGroupUnpaid(id: string, groupId: string): Promise<void> {
    await supabase.from('transactions').delete().eq('id', id)
    await supabase
      .from('transactions')
      .delete()
      .eq('recurrence_group_id', groupId)
      .eq('paid', false)
      .neq('id', id)
    await fetch()
  }

  async function deleteTransactionGroup(groupId: string): Promise<void> {
    // CASCADE apaga as transactions automaticamente
    const { error } = await supabase.from('recurrence_groups').delete().eq('id', groupId)
    if (error) throw new Error(error.message)
    await fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    transactions,
    total,
    filteredTotal,
    totalPages,
    page,
    setPage,
    loading,
    error,
    refresh: fetch,
    createTransaction,
    updateTransaction,
    updateRecurrenceGroup,
    updateRecurrenceFromHere,
    updateTransactionPayment,
    unefetivateTransaction,
    deleteTransaction,
    deleteTransactionGroupUnpaid,
    deleteTransactionGroup,
  }
}
