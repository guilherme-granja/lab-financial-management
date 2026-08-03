import { useState } from 'react'
import { useSupabaseClient } from '@/hooks/useDatabase'
import { useAuth } from '@/hooks/useAuth'
import { logActivity } from '@/lib/activity-log'

export type AccountResetStep =
  | 'idle' | 'transactions' | 'budgets' | 'accounts' | 'verifying' | 'done' | 'partial'

export interface AccountResetSummary {
  transactionsDeleted: number
  budgetsDeleted: number
  accountsDeleted: number
}

export interface AccountResetRemaining {
  transactions: number
  budgets: number
  accounts: number
}

interface UseAccountResetResult {
  step: AccountResetStep
  resetting: boolean
  summary: AccountResetSummary | null
  remaining: AccountResetRemaining | null
  error: string | null
  resetAccount: () => Promise<void>
}

const MATCH_ALL_ID = '00000000-0000-0000-0000-000000000000'

export function useAccountReset(): UseAccountResetResult {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  const [step, setStep] = useState<AccountResetStep>('idle')
  const [summary, setSummary] = useState<AccountResetSummary | null>(null)
  const [remaining, setRemaining] = useState<AccountResetRemaining | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resetAccount() {
    setError(null)

    setStep('transactions')
    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .delete()
      .neq('id', MATCH_ALL_ID)
      .select('id')
    if (txErr) setError(txErr.message)
    const transactionsDeleted = txData?.length ?? 0
    await supabase.from('recurrence_groups').delete().neq('id', MATCH_ALL_ID)

    setStep('budgets')
    const { data: budgetData, error: budgetErr } = await supabase
      .from('monthly_budgets')
      .delete()
      .neq('id', MATCH_ALL_ID)
      .select('id')
    if (budgetErr) setError(budgetErr.message)
    const budgetsDeleted = budgetData?.length ?? 0

    setStep('accounts')
    const { data: accountData, error: accountErr } = await supabase
      .from('accounts')
      .delete()
      .neq('id', MATCH_ALL_ID)
      .select('id')
    if (accountErr) setError(accountErr.message)
    const accountsDeleted = accountData?.length ?? 0

    setStep('verifying')
    const [txCount, budgetCount, accountCount] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('monthly_budgets').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('id', { count: 'exact', head: true }),
    ])

    const remainingTransactions = txCount.count ?? 0
    const remainingBudgets = budgetCount.count ?? 0
    const remainingAccounts = accountCount.count ?? 0

    if (remainingTransactions === 0 && remainingBudgets === 0 && remainingAccounts === 0) {
      setSummary({ transactionsDeleted, budgetsDeleted, accountsDeleted })
      setRemaining(null)
      setStep('done')
      if (user) {
        logActivity(user.id, 'account_data_reset', {
          transactions_deleted: transactionsDeleted,
          budgets_deleted: budgetsDeleted,
          accounts_deleted: accountsDeleted,
        })
      }
    } else {
      setRemaining({
        transactions: remainingTransactions,
        budgets: remainingBudgets,
        accounts: remainingAccounts,
      })
      setStep('partial')
    }
  }

  const resetting = step !== 'idle' && step !== 'done' && step !== 'partial'

  return { step, resetting, summary, remaining, error, resetAccount }
}
