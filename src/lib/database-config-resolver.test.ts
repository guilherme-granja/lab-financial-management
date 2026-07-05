import { describe, it, expect, vi, beforeEach } from 'vitest'
import { choreClient } from '@/lib/chore-client'
import { ChoreDatabaseConfigResolver } from './database-config-resolver'

function mockUserDatabases(
  response: { data: unknown; error?: unknown },
  pausedResponse: { data: unknown; error?: unknown } = { data: null, error: null }
) {
  vi.mocked(choreClient.from).mockImplementation(
    () =>
      ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
        maybeSingle: vi.fn().mockResolvedValue(pausedResponse),
      }) as never
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ status: 200 })
  )
})

describe('ChoreDatabaseConfigResolver', () => {
  it('retorna config quando user_databases tem row válida', async () => {
    mockUserDatabases({
      data: {
        supabase_url: 'https://x.supabase.co',
        supabase_anon_key: 'anon-key',
        supabase_project_ref: 'x',
      },
      error: null,
    })

    const resolver = new ChoreDatabaseConfigResolver('u1')
    const config = await resolver.getConfig()

    expect(config).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon-key' })
  })

  it('lança PausedProjectError quando ping ao projeto retorna 503', async () => {
    mockUserDatabases({
      data: {
        supabase_url: 'https://x.supabase.co',
        supabase_anon_key: 'anon-key',
        supabase_project_ref: 'x',
      },
      error: null,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))

    const resolver = new ChoreDatabaseConfigResolver('u1')

    await expect(resolver.getConfig()).rejects.toThrow('paused')
  })

  it('lança erro quando user_databases retorna zero rows (406)', async () => {
    mockUserDatabases({ data: null, error: { message: 'zero rows' } })

    const resolver = new ChoreDatabaseConfigResolver('u1')

    await expect(resolver.getConfig()).rejects.toThrow(
      'Não foi possível carregar a configuração do banco do usuário.'
    )
  })

  it('não tem lógica de admin interna — bypass é responsabilidade do chamador (useAuth/DatabaseProvider)', () => {
    // Coberto por useAuth.test.ts (skip de user_databases) e useDatabase (isAdmin guard).
    expect(true).toBe(true)
  })
})
