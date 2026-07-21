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
  localStorage.clear()
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
        stale: false,
      },
    ])
  })

  it('ping seta checking e depois healthy quando fetch ok', async () => {
    mockFromOrder([ROW])
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.ping('u1')
    })

    expect(result.current.databases[0].health).toBe('healthy')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://u1.supabase.co/rest/v1/categories?select=id&limit=1',
      {
        headers: {
          apikey: 'anon-key',
          Authorization: 'Bearer anon-key',
        },
      }
    )
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

  it('ping bem-sucedido persiste o resultado em localStorage', async () => {
    mockFromOrder([ROW])
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.ping('u1')
    })

    const cached = JSON.parse(localStorage.getItem('lab-financas:ping-health:u1')!)
    expect(cached.health).toBe('healthy')
    expect(typeof cached.last_checked_at).toBe('string')
  })

  it('hidrata health/last_checked_at de um valor já presente em localStorage', async () => {
    localStorage.setItem(
      'lab-financas:ping-health:u1',
      JSON.stringify({ health: 'healthy', last_checked_at: '2026-07-21T10:00:00.000Z' })
    )
    mockFromOrder([ROW])

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.databases[0].health).toBe('healthy')
    expect(result.current.databases[0].last_checked_at).toBe('2026-07-21T10:00:00.000Z')
  })

  it('stale vem true pra last_checked_at de mais de 24h e false pra um recente', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    localStorage.setItem('lab-financas:ping-health:u1', JSON.stringify({ health: 'healthy', last_checked_at: old }))
    mockFromOrder([ROW])

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.databases[0].stale).toBe(true)

    localStorage.setItem('lab-financas:ping-health:u1', JSON.stringify({ health: 'healthy', last_checked_at: recent }))
    const { result: result2 } = renderHook(() => useDatabases())
    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(result2.current.databases[0].stale).toBe(false)
  })

  it('não quebra quando localStorage lança (setItem/getItem indisponíveis)', async () => {
    mockFromOrder([ROW])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage indisponível')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage indisponível')
    })
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)

    const { result } = renderHook(() => useDatabases())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.databases[0].health).toBe('unknown')

    await expect(
      act(async () => {
        await result.current.ping('u1')
      })
    ).resolves.not.toThrow()

    expect(result.current.databases[0].health).toBe('healthy')
  })
})
