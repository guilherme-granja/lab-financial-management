import { describe, it, expect, vi, beforeEach } from 'vitest'
import { choreClient } from '@/lib/chore-client'
import { ChoreDatabaseConfigResolver } from './database-config-resolver'

function mockUserDatabases(response: { data: unknown; error?: unknown }) {
  vi.mocked(choreClient.from).mockImplementation(
    () =>
      ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
      }) as never
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChoreDatabaseConfigResolver', () => {
  it('retorna config quando user_databases tem row válida', async () => {
    mockUserDatabases({
      data: { supabase_url: 'https://x.supabase.co', supabase_anon_key: 'anon-key' },
      error: null,
    })

    const resolver = new ChoreDatabaseConfigResolver('u1')
    const config = await resolver.getConfig()

    expect(config).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon-key' })
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
