import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAccounts } from './useAccounts'
import { mockSupabaseResult } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAccounts', () => {
  it('retorna lista de contas ordenada por nome', async () => {
    const accounts = [
      {
        id: '1',
        name: 'Nubank',
        type: 'checking' as const,
        color: '#8b5cf6',
        icon: '💳',
        include_in_dashboard: true,
        initial_balance: 0,
        created_at: '',
      },
      {
        id: '2',
        name: 'Bradesco',
        type: 'savings' as const,
        color: '#2563eb',
        icon: '🏦',
        include_in_dashboard: false,
        initial_balance: 0,
        created_at: '',
      },
    ]
    mockSupabaseResult({ data: accounts })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accounts).toHaveLength(2)
    expect(result.current.accounts[0].name).toBe('Nubank')
    expect(result.current.accounts[1].name).toBe('Bradesco')
  })

  it('createAccount lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'insert failed' } })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.createAccount({
        name: 'X',
        type: 'cash',
        color: '#fff',
        icon: '💰',
        include_in_dashboard: true,
        initial_balance: 0,
      })
    ).rejects.toThrow('insert failed')
  })
})
