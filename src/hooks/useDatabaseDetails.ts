import { useState, useCallback, useEffect } from 'react'
import { choreClient } from '@/lib/chore-client'
import type { UserDatabase } from '@/hooks/useDatabases'

export interface DatabaseDetails {
  compute: string | null
  lastBackup: { insertedAt: string; status: string } | null
  egressBytes: number | null
  mau: number | null
  databaseSizeBytes: number | null
  storageSizeBytes: number | null
  lastMigration: { version: string; name: string; insertedAt: string } | null
}

interface DatabaseDetailsErrors {
  details: string | null
  stats: string | null
  migration: string | null
}

const EMPTY_DETAILS: DatabaseDetails = {
  compute: null,
  lastBackup: null,
  egressBytes: null,
  mau: null,
  databaseSizeBytes: null,
  storageSizeBytes: null,
  lastMigration: null,
}

async function callRpc(supabaseUrl: string, anonKey: string, fn: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  if (!res.ok) throw new Error(`RPC ${fn} falhou: ${res.status}`)
  const rows = await res.json()
  return Array.isArray(rows) ? rows[0] : rows
}

export function useDatabaseDetails(userId: string, db: UserDatabase | undefined) {
  const [details, setDetails] = useState<DatabaseDetails>(EMPTY_DETAILS)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<DatabaseDetailsErrors>({ details: null, stats: null, migration: null })

  const refresh = useCallback(async () => {
    if (!db) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErrors({ details: null, stats: null, migration: null })

    const [detailsResult, statsResult, migrationResult] = await Promise.allSettled([
      choreClient.functions.invoke('manage-database', { body: { action: 'details', user_id: userId } }),
      callRpc(db.supabase_url, db.supabase_anon_key, 'get_database_stats'),
      callRpc(db.supabase_url, db.supabase_anon_key, 'get_last_migration'),
    ])

    setDetails((prev) => {
      const next = { ...prev }

      if (detailsResult.status === 'fulfilled' && !detailsResult.value.error) {
        const data = detailsResult.value.data as {
          compute: string | null
          lastBackup: { insertedAt: string; status: string } | null
          egressBytes: number | null
          mau: number | null
        }
        next.compute = data.compute
        next.lastBackup = data.lastBackup
        next.egressBytes = data.egressBytes
        next.mau = data.mau
      }

      if (statsResult.status === 'fulfilled') {
        next.databaseSizeBytes = statsResult.value?.database_size_bytes ?? null
        next.storageSizeBytes = statsResult.value?.storage_size_bytes ?? null
      }

      if (migrationResult.status === 'fulfilled' && migrationResult.value) {
        next.lastMigration = {
          version: migrationResult.value.version,
          name: migrationResult.value.name,
          insertedAt: migrationResult.value.inserted_at,
        }
      }

      return next
    })

    setErrors({
      details:
        detailsResult.status === 'rejected'
          ? (detailsResult.reason as Error).message
          : detailsResult.status === 'fulfilled' && detailsResult.value.error
            ? detailsResult.value.error.message
            : null,
      stats: statsResult.status === 'rejected' ? (statsResult.reason as Error).message : null,
      migration: migrationResult.status === 'rejected' ? (migrationResult.reason as Error).message : null,
    })

    setLoading(false)
  }, [userId, db])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, db?.user_id])

  return { details, loading, errors, refresh }
}
