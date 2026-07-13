import { useEffect, useRef, useState } from 'react'
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns'
import { useSupabaseClient } from '@/hooks/useDatabase'
import { useSelectedMonth } from '@/hooks/useSelectedMonth'

export interface TransactionSearchResult {
  id: string
  date: string
  description: string | null
  amount: number
  type: 'income' | 'expense' | 'transfer'
  paid: boolean
  category_id: string | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
  account_id: string | null
  account_name: string | null
}

interface UseTransactionSearchResult {
  query: string
  setQuery: (q: string) => void
  results: TransactionSearchResult[]
  loading: boolean
  error: string | null
}

export function useTransactionSearch(): UseTransactionSearchResult {
  const supabase = useSupabaseClient()
  const { month } = useSelectedMonth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TransactionSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    const currentRequest = ++requestId.current

    const monthStart = startOfMonth(parseISO(`${month}-01`))
    const monthEnd = endOfMonth(parseISO(`${month}-01`))

    const timer = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc('search_transactions', {
        p_query: trimmed,
        p_start_date: format(monthStart, 'yyyy-MM-dd'),
        p_end_date: format(monthEnd, 'yyyy-MM-dd'),
        p_limit: 8,
      })

      if (currentRequest !== requestId.current) return

      if (rpcError) {
        setError('Não foi possível buscar transações.')
        setResults([])
        setLoading(false)
        return
      }

      setResults((data as TransactionSearchResult[]) ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, month, supabase])

  return { query, setQuery, results, loading, error }
}
