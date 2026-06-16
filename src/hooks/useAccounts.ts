import { useState, useEffect, useCallback } from 'react'
import { format, endOfMonth, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Account, AccountType } from '@/types'

export interface AccountPayload {
  name: string
  type: AccountType
  color: string
  icon: string
  include_in_dashboard: boolean
  initial_balance: number
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('accounts')
      .select('*')
      .order('name')
    if (err) setError(err.message)
    else setAccounts((data as Account[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  async function createAccount(payload: AccountPayload) {
    const { error: err } = await supabase.from('accounts').insert(payload)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function updateAccount(id: string, payload: Partial<AccountPayload>) {
    const { error: err } = await supabase.from('accounts').update(payload).eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function deleteAccount(id: string) {
    const { error: err } = await supabase.from('accounts').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function getAccountBalance(id: string, initialBalance: number): Promise<number> {
    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', id)
      .eq('paid', true)
      .in('type', ['income', 'expense'])
    if (!data) return initialBalance
    const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return initialBalance + income - expense
  }

  async function getAccountTransactionCount(id: string): Promise<number> {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`account_id.eq.${id},to_account_id.eq.${id}`)
    return count ?? 0
  }

  async function getAccountStats(
    accountId: string,
    month: string,
  ): Promise<{ income: number; expense: number; transfer: number }> {
    const from = `${month}-01`
    const to = format(endOfMonth(parseISO(from)), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('transactions')
      .select('type, account_id, to_account_id')
      .or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .gte('date', from)
      .lte('date', to)

    const rows = data ?? []
    return {
      income: rows.filter((r) => r.account_id === accountId && r.type === 'income').length,
      expense: rows.filter((r) => r.account_id === accountId && r.type === 'expense').length,
      transfer: rows.filter(
        (r) =>
          (r.account_id === accountId || r.to_account_id === accountId) && r.type === 'transfer',
      ).length,
    }
  }

  return {
    accounts,
    loading,
    error,
    refresh: fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountBalance,
    getAccountTransactionCount,
    getAccountStats,
  }
}
