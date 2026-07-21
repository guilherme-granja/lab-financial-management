import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { choreClient } from '@/lib/chore-client'
import { useDatabaseDetails } from './useDatabaseDetails'
import type { UserDatabase } from './useDatabases'

const DB: UserDatabase = {
  user_id: 'u1',
  full_name: 'Fulano',
  project_ref: 'u1ref',
  supabase_url: 'https://u1.supabase.co',
  supabase_anon_key: 'anon-key',
  status: 'active',
  paused_at: null,
  health: 'healthy',
  last_checked_at: null,
  stale: false,
}

const STATS_ROW = { database_size_bytes: 1000, storage_size_bytes: 2000 }
const MIGRATION_ROW = { version: '20260721000000', name: 'add_x', inserted_at: '2026-07-21T00:00:00.000Z' }

function mockRpcFetch(impl: (fn: string) => Promise<Response>) {
  vi.spyOn(global, 'fetch').mockImplementation((url) => {
    const fn = String(url).split('/rpc/')[1]
    return impl(fn)
  })
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDatabaseDetails', () => {
  it('carrega as 3 fontes com sucesso e popula details', async () => {
    vi.mocked(choreClient.functions.invoke).mockResolvedValue({
      data: { compute: 'Nano', lastBackup: null, egressBytes: 123, mau: 4 },
      error: null,
    } as never)
    mockRpcFetch((fn) =>
      fn === 'get_database_stats' ? jsonResponse([STATS_ROW]) : jsonResponse([MIGRATION_ROW])
    )

    const { result } = renderHook(() => useDatabaseDetails('u1', DB))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.details).toEqual({
      compute: 'Nano',
      lastBackup: null,
      egressBytes: 123,
      mau: 4,
      databaseSizeBytes: 1000,
      storageSizeBytes: 2000,
      lastMigration: { version: '20260721000000', name: 'add_x', insertedAt: '2026-07-21T00:00:00.000Z' },
    })
    expect(result.current.errors).toEqual({ details: null, stats: null, migration: null })
  })

  it('uma fonte falhando não impede as outras duas de preencher details', async () => {
    vi.mocked(choreClient.functions.invoke).mockRejectedValue(new Error('edge function down'))
    mockRpcFetch((fn) =>
      fn === 'get_database_stats' ? jsonResponse([STATS_ROW]) : jsonResponse([MIGRATION_ROW])
    )

    const { result } = renderHook(() => useDatabaseDetails('u1', DB))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.details.databaseSizeBytes).toBe(1000)
    expect(result.current.details.lastMigration).toEqual({
      version: '20260721000000',
      name: 'add_x',
      insertedAt: '2026-07-21T00:00:00.000Z',
    })
    expect(result.current.errors.details).toBe('edge function down')
  })

  it('egressBytes/mau viram null sem lançar quando o Edge Function retorna null', async () => {
    vi.mocked(choreClient.functions.invoke).mockResolvedValue({
      data: { compute: null, lastBackup: null, egressBytes: null, mau: null },
      error: null,
    } as never)
    mockRpcFetch((fn) =>
      fn === 'get_database_stats' ? jsonResponse([STATS_ROW]) : jsonResponse([MIGRATION_ROW])
    )

    const { result } = renderHook(() => useDatabaseDetails('u1', DB))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.details.egressBytes).toBeNull()
    expect(result.current.details.mau).toBeNull()
    expect(result.current.errors.details).toBeNull()
  })
})
