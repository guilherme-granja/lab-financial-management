import { useState, useEffect, useCallback } from 'react'
import { choreClient } from '@/lib/chore-client'

const PING_CACHE_PREFIX = 'lab-financas:ping-health:'
const STALE_AFTER_MS = 24 * 60 * 60 * 1000 // 24h

interface CachedHealth {
  health: 'healthy' | 'unhealthy'
  last_checked_at: string
}

function readCachedHealth(userId: string): CachedHealth | null {
  try {
    const raw = localStorage.getItem(PING_CACHE_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null // localStorage indisponível (aba anônima, quota, etc.) — segue sem cache
  }
}

function writeCachedHealth(userId: string, health: 'healthy' | 'unhealthy', checkedAt: string) {
  try {
    localStorage.setItem(PING_CACHE_PREFIX + userId, JSON.stringify({ health, last_checked_at: checkedAt }))
  } catch {
    // silencioso — se não conseguir persistir, a página continua funcionando só sem cache
  }
}

function isStale(lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return false
  return Date.now() - new Date(lastCheckedAt).getTime() > STALE_AFTER_MS
}

export interface UserDatabase {
  user_id: string
  full_name: string
  project_ref: string
  supabase_url: string
  supabase_anon_key: string
  status: 'active' | 'paused'
  paused_at: string | null
  health: 'unknown' | 'checking' | 'healthy' | 'unhealthy'
  last_checked_at: string | null
  stale: boolean
}

interface UserDatabaseRow {
  user_id: string
  supabase_url: string
  supabase_anon_key: string
  supabase_project_ref: string | null
  status: 'active' | 'paused'
  paused_at: string | null
  profiles: { name: string | null } | { name: string | null }[] | null
}

export function useDatabases() {
  const [databases, setDatabases] = useState<UserDatabase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDatabases = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await choreClient
      .from('user_databases')
      .select(`
        user_id,
        supabase_url,
        supabase_anon_key,
        supabase_project_ref,
        status,
        paused_at,
        profiles ( name )
      `)
      .order('user_id')

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const mapped: UserDatabase[] = ((data ?? []) as unknown as UserDatabaseRow[]).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const cached = readCachedHealth(row.user_id)
      return {
        user_id: row.user_id,
        full_name: profile?.name ?? '',
        project_ref: row.supabase_project_ref ?? '',
        supabase_url: row.supabase_url,
        supabase_anon_key: row.supabase_anon_key,
        status: row.status,
        paused_at: row.paused_at,
        health: cached?.health ?? 'unknown',
        last_checked_at: cached?.last_checked_at ?? null,
        stale: isStale(cached?.last_checked_at ?? null),
      }
    })
    mapped.sort((a, b) => a.full_name.localeCompare(b.full_name))
    setDatabases(mapped)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDatabases()
  }, [fetchDatabases])

  function setHealth(userId: string, health: UserDatabase['health'], lastCheckedAt: string | null = null) {
    if ((health === 'healthy' || health === 'unhealthy') && lastCheckedAt) {
      writeCachedHealth(userId, health, lastCheckedAt)
    }
    setDatabases((prev) =>
      prev.map((d) => {
        if (d.user_id !== userId) return d
        const nextLastCheckedAt = lastCheckedAt ?? d.last_checked_at
        return { ...d, health, last_checked_at: nextLastCheckedAt, stale: isStale(nextLastCheckedAt) }
      })
    )
  }

  const ping = useCallback(
    async (userId: string) => {
      const db = databases.find((d) => d.user_id === userId)
      if (!db) return
      setHealth(userId, 'checking')
      try {
        const res = await fetch(`${db.supabase_url}/rest/v1/categories?select=id&limit=1`, {
          headers: {
            apikey: db.supabase_anon_key,
            Authorization: `Bearer ${db.supabase_anon_key}`,
          },
        })
        setHealth(userId, res.ok ? 'healthy' : 'unhealthy', new Date().toISOString())
      } catch {
        setHealth(userId, 'unhealthy', new Date().toISOString())
      }
    },
    [databases]
  )

  const pingAll = useCallback(async () => {
    await Promise.allSettled(databases.map((d) => ping(d.user_id)))
  }, [databases, ping])

  async function deactivate(userId: string): Promise<void> {
    const { data, error: err } = await choreClient.functions.invoke('manage-database', {
      body: { action: 'pause', user_id: userId },
    })
    if (err) throw new Error(err.message)
    const result = data as { error?: string }
    if (result?.error) throw new Error(result.error)

    setDatabases((prev) =>
      prev.map((d) =>
        d.user_id === userId ? { ...d, status: 'paused', paused_at: new Date().toISOString() } : d
      )
    )
  }

  async function reactivate(userId: string): Promise<void> {
    const { data, error: err } = await choreClient.functions.invoke('manage-database', {
      body: { action: 'restore', user_id: userId },
    })
    if (err) throw new Error(err.message)
    const result = data as { error?: string }
    if (result?.error) throw new Error(result.error)

    setDatabases((prev) =>
      prev.map((d) => (d.user_id === userId ? { ...d, status: 'active', paused_at: null } : d))
    )
  }

  return { databases, loading, error, ping, pingAll, deactivate, reactivate, refresh: fetchDatabases }
}
