import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useTransactions } from './useTransactions'
import { mockSupabaseResult, mockLike, mockGte, mockLte, mockFrom } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'))

const DEFAULT_FILTERS = {
  period: '2026-06',
  periodType: 'monthly' as const,
  type: 'all' as const,
  categoryId: 'all',
  status: 'all' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTransactions', () => {
  it('inicia com loading=true', () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    expect(result.current.loading).toBe(true)
  })

  it('retorna transações após fetch', async () => {
    const tx = {
      id: '1',
      amount: 100,
      type: 'expense' as const,
      date: '2026-06-01',
      paid: true,
      category_id: null,
      account_id: null,
      to_account_id: null,
      description: null,
      created_at: '2026-06-01',
      recurrence: 'none' as const,
      installments: null,
      installment_index: null,
      recurrence_group_id: null,
      paid_at: null,
      paid_amount: null,
    }
    mockSupabaseResult({ data: [tx], count: 1 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0].id).toBe('1')
  })

  it('seta error quando Supabase retorna erro', async () => {
    mockSupabaseResult({ data: null, error: { message: 'DB error' } })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('DB error')
    expect(result.current.transactions).toHaveLength(0)
  })

  it('reseta page para 1 ao mudar filtros', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result, rerender } = renderHook(
      ({ filters }) => useTransactions(filters),
      { initialProps: { filters: DEFAULT_FILTERS } }
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.setPage(3) })
    rerender({ filters: { ...DEFAULT_FILTERS, type: 'income' as const } })
    await waitFor(() => expect(result.current.page).toBe(1))
  })

  it('calcula totalPages corretamente', async () => {
    mockSupabaseResult({
      data: Array(20).fill({
        id: '1',
        amount: 10,
        type: 'expense',
        date: '2026-06-01',
        paid: true,
        category_id: null,
        account_id: null,
        to_account_id: null,
        description: null,
        created_at: '',
        recurrence: 'none',
        installments: null,
        installment_index: null,
        recurrence_group_id: null,
        paid_at: null,
        paid_amount: null,
      }),
      count: 45,
    })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalPages).toBe(3) // ceil(45/20)
  })

  it('usa gte/lte para filtro de data mensal — não usa like()', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => {
      expect(mockLike).not.toHaveBeenCalled()
      expect(mockGte).toHaveBeenCalled()
      expect(mockLte).toHaveBeenCalled()
    })
  })
})
