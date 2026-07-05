import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { choreClient } from '@/lib/chore-client'
import { AuthProvider, useAuth } from './useAuth'

const fakeUser = { id: 'u1', email: 'x@x.com' } as User

function setSession(user: User | null) {
  vi.mocked(choreClient.auth.getSession).mockResolvedValue({
    data: { session: user ? ({ user } as never) : null },
  } as never)
}

function builder(response: { data: unknown; error?: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(response),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
  }
}

function mockFrom(responses: Record<string, { data: unknown; error?: unknown }>) {
  vi.mocked(choreClient.from).mockImplementation(
    (table: string) => builder(responses[table] ?? { data: null, error: null }) as never
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAuth — fluxo admin', () => {
  it('admin: não busca user_databases', async () => {
    setSession(fakeUser)
    mockFrom({ profiles: { data: { is_admin: true, is_active: true } } })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isAdmin).toBe(true)
    expect(choreClient.from).not.toHaveBeenCalledWith('user_databases')
  })

  it('admin: isAdmin exposto como true no contexto', async () => {
    setSession(fakeUser)
    mockFrom({ profiles: { data: { is_admin: true, is_active: true } } })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isAdmin).toBe(true)
    expect(result.current.user).not.toBeNull()
  })
})

describe('useAuth — fluxo usuário normal', () => {
  it('usuário sem user_databases ativo: recebe erro de conta não configurada', async () => {
    setSession(fakeUser)
    mockFrom({
      profiles: { data: { is_admin: false, is_active: true } },
      user_databases: { data: null },
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.authError).toMatch(/não está configurada/)
  })

  it('usuário com user_databases ativo: autenticado com sucesso', async () => {
    setSession(fakeUser)
    mockFrom({
      profiles: { data: { is_admin: false, is_active: true } },
      user_databases: { data: { id: 'db1' } },
    })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).not.toBeNull()
    expect(result.current.isAdmin).toBe(false)
  })

  it('usuário inativo: signOut é chamado', async () => {
    setSession(fakeUser)
    mockFrom({ profiles: { data: { is_admin: false, is_active: false } } })

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(choreClient.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })
})
