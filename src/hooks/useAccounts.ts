import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, AccountType } from '@/types'

export interface AccountPayload {
  name: string
  type: AccountType
  color: string
  icon: string
  include_in_dashboard: boolean
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

  async function getAccountBalance(id: string): Promise<number> {
    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', id)
      .eq('paid', true)
      .in('type', ['income', 'expense'])
    if (!data) return 0
    const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return income - expense
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
  }
}
