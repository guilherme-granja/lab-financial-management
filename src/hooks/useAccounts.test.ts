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

  it('createAccount não lança erro no caso de sucesso', async () => {
    mockSupabaseResult({ data: [] })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.createAccount({ name: 'Nubank', type: 'checking', color: '#8b5cf6', icon: '💳', include_in_dashboard: true, initial_balance: 0 })
    ).resolves.toBeUndefined()
  })

  it('updateAccount não lança erro no caso de sucesso', async () => {
    mockSupabaseResult({ data: [] })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateAccount('acc-1', { name: 'Nubank Premium' })
    ).resolves.toBeUndefined()
  })

  it('updateAccount lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'update failed' } })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateAccount('acc-1', { name: 'X' })
    ).rejects.toThrow('update failed')
  })

  it('deleteAccount não lança erro no caso de sucesso', async () => {
    mockSupabaseResult({ data: [] })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.deleteAccount('acc-1')
    ).resolves.toBeUndefined()
  })

  it('deleteAccount lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'delete failed' } })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.deleteAccount('acc-1')
    ).rejects.toThrow('delete failed')
  })

  it('getAccountBalance retorna saldo calculado', async () => {
    mockSupabaseResult({
      data: [
        { amount: 1000, type: 'income' },
        { amount: 400, type: 'expense' },
      ],
    })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    // initialBalance=500, income=1000, expense=400 → 500+1000-400=1100
    const balance = await result.current.getAccountBalance('acc-1', 500)
    expect(balance).toBe(1100)
  })

  it('getAccountBalance retorna initialBalance quando sem dados', async () => {
    mockSupabaseResult({ data: null })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const balance = await result.current.getAccountBalance('acc-1', 250)
    expect(balance).toBe(250)
  })

  it('getAccountTransactionCount retorna count', async () => {
    mockSupabaseResult({ data: [], count: 7 })
    const { result } = renderHook(() => useAccounts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const count = await result.current.getAccountTransactionCount('acc-1')
    expect(count).toBe(7)
  })
})
