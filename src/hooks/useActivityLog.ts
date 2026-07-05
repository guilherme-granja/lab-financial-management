import { useState, useEffect, useCallback } from 'react'
import { choreClient } from '@/lib/chore-client'

export interface ActivityLogEntry {
  id: string
  user_id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

export interface ActivityLogFilters {
  userId?: string
  action?: string
  page: number
}

interface ActivityLogRow {
  id: string
  user_id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
  profiles: { name: string | null; email: string } | null
}

const PAGE_SIZE = 20

export function useActivityLog(filters: ActivityLogFilters) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = choreClient
      .from('activity_log')
      .select(`
        id, user_id, action, metadata, created_at,
        profiles!inner ( name, email )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE - 1)

    if (filters.userId) query = query.eq('user_id', filters.userId)
    if (filters.action) query = query.eq('action', filters.action)

    const { data, error: err, count } = await query

    if (err) {
      setError(err.message)
    } else {
      const mapped = ((data ?? []) as unknown as ActivityLogRow[]).map((e) => ({
        id: e.id,
        user_id: e.user_id,
        action: e.action,
        metadata: e.metadata,
        created_at: e.created_at,
        user_name: e.profiles?.name ?? null,
        user_email: e.profiles?.email ?? null,
      }))
      setEntries(mapped)
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [filters.page, filters.userId, filters.action])

  useEffect(() => { fetch() }, [fetch])

  return { entries, total, totalPages: Math.ceil(total / PAGE_SIZE), loading, error, refresh: fetch }
}
