import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { choreClient } from '@/lib/chore-client'
import { useDatabases } from './useDatabases'

const ROW = {
  user_id: 'u1',
  supabase_url: 'https://u1.supabase.co',
  supabase_anon_key: 'anon-key',
  supabase_project_ref: 'u1ref',
  status: 'active' as const,
  paused_at: null,
  profiles: { name: 'Fulano' },
}

function mockFromOrder(data: unknown, error: unknown = null) {
  vi.mocked(choreClient.from).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useDatabases', () => {
  it('carrega lista de databases mapeada', async () => {
    mockFromOrder([ROW])

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.databases).toEqual([
      {
        user_id: 'u1',
        full_name: 'Fulano',
        project_ref: 'u1ref',
        supabase_url: 'https://u1.supabase.co',
        supabase_anon_key: 'anon-key',
        status: 'active',
        paused_at: null,
        health: 'unknown',
        last_checked_at: null,
      },
    ])
  })

  it('ping seta checking e depois healthy quando fetch ok', async () => {
    mockFromOrder([ROW])
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.ping('u1')
    })

    expect(result.current.databases[0].health).toBe('healthy')
  })

  it('ping não lança e marca unhealthy quando fetch falha', async () => {
    mockFromOrder([ROW])
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.ping('u1')
      })
    ).resolves.not.toThrow()

    expect(result.current.databases[0].health).toBe('unhealthy')
  })

  it('pingAll roda ping pra cada linha sem quebrar se uma rejeitar', async () => {
    const ROW2 = { ...ROW, user_id: 'u2', supabase_url: 'https://u2.supabase.co', profiles: { name: 'Ciclano' } }
    mockFromOrder([ROW, ROW2])
    vi.spyOn(global, 'fetch').mockImplementation((url) =>
      String(url).includes('u1.supabase.co')
        ? Promise.resolve({ ok: true } as Response)
        : Promise.reject(new Error('down'))
    )

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.pingAll()
    })

    expect(result.current.databases.find((d) => d.user_id === 'u1')?.health).toBe('healthy')
    expect(result.current.databases.find((d) => d.user_id === 'u2')?.health).toBe('unhealthy')
  })

  it('deactivate atualiza status localmente sem refazer a query', async () => {
    mockFromOrder([ROW])
    vi.mocked(choreClient.functions.invoke).mockResolvedValue({ data: { status: 'paused' }, error: null } as never)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const fromCallsBefore = vi.mocked(choreClient.from).mock.calls.length

    await act(async () => {
      await result.current.deactivate('u1')
    })

    expect(result.current.databases[0].status).toBe('paused')
    expect(vi.mocked(choreClient.from).mock.calls.length).toBe(fromCallsBefore)
  })

  it('erro de functions.invoke propaga como exceção', async () => {
    mockFromOrder([ROW])
    vi.mocked(choreClient.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'falha na management api' },
    } as never)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.deactivate('u1')).rejects.toThrow('falha na management api')
  })
})
