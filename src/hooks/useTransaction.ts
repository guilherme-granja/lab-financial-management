import { useEffect, useState, useCallback } from 'react'
import { useSupabaseClient } from '@/hooks/useDatabase'
import { fetchTransactionById } from '@/hooks/useTransactions'
import type { Transaction } from '@/types'

export function useTransaction(id: string | undefined) {
  const supabase = useSupabaseClient()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) {
      setTransaction(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchTransactionById(supabase, id)
    setTransaction(data)
    setError(err)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { transaction, loading, error }
}
