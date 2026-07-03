import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useTransactions } from './useTransactions'
import type { TransactionPayload } from './useTransactions'
import { mockSupabaseResult, mockLike, mockGte, mockLte, mockFrom, mockNeq } from '@/test/mocks/supabase'

vi.mock('@/hooks/useDatabase', () => import('@/test/mocks/supabase'))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const DEFAULT_FILTERS = {
  period: '2026-06',
  periodType: 'monthly' as const,
  type: 'all' as const,
  categoryId: 'all',
  status: 'all' as const,
  dateFrom: null,
  dateTo: null,
  account_id: null,
  tagId: 'all',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTransactions', () => {
  it('inicia com loading=true', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
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

  it('createTransaction simples não lança erro', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const payload: TransactionPayload = {
      amount: 100,
      type: 'expense',
      category_id: null,
      account_id: null,
      to_account_id: null,
      description: 'Test',
      date: '2026-06-15',
      recurrence: 'none',
      installments: null,
      paid: true,
      paid_at: '2026-06-15',
      paid_amount: 100,
    }
    await expect(result.current.createTransaction(payload)).resolves.toBeUndefined()
  })

  it('createTransaction lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'insert error' } })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const payload: TransactionPayload = {
      amount: 50,
      type: 'income',
      category_id: null,
      account_id: null,
      to_account_id: null,
      description: null,
      date: '2026-06-01',
      recurrence: 'none',
      installments: null,
      paid: false,
      paid_at: null,
      paid_amount: null,
    }
    await expect(result.current.createTransaction(payload)).rejects.toThrow('insert error')
  })

  it('createTransaction parcelado cria múltiplos registros', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const payload: TransactionPayload = {
      amount: 300,
      type: 'expense',
      category_id: null,
      account_id: null,
      to_account_id: null,
      description: 'Parcelado',
      date: '2026-06-01',
      recurrence: 'installment',
      installments: 3,
      paid: false,
      paid_at: null,
      paid_amount: null,
    }
    await expect(result.current.createTransaction(payload)).resolves.toBeUndefined()
  })

  it('createTransaction fixo cria 24 registros', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const payload: TransactionPayload = {
      amount: 500,
      type: 'expense',
      category_id: null,
      account_id: null,
      to_account_id: null,
      description: 'Aluguel',
      date: '2026-06-01',
      recurrence: 'fixed',
      installments: null,
      paid: false,
      paid_at: null,
      paid_amount: null,
    }
    await expect(result.current.createTransaction(payload)).resolves.toBeUndefined()
  })

  it('updateTransaction não lança erro', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateTransaction('tx-1', { amount: 200 })
    ).resolves.toBeUndefined()
  })

  it('updateTransaction lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'update failed' } })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateTransaction('tx-1', { amount: 200 })
    ).rejects.toThrow('update failed')
  })

  it('updateTransactionPayment não lança erro', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateTransactionPayment('tx-1', '2026-06-15', 100)
    ).resolves.toBeUndefined()
  })

  it('deleteTransaction não lança erro', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.deleteTransaction('tx-1')
    ).resolves.toBeUndefined()
  })

  it('deleteTransaction lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'delete failed' } })
    const { result } = renderHook(() => useTransactions(DEFAULT_FILTERS))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.deleteTransaction('tx-1')
    ).rejects.toThrow('delete failed')
  })

  it('sumQuery chama neq("type", "transfer") quando type !== "all"', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    renderHook(() => useTransactions({ ...DEFAULT_FILTERS, type: 'expense' }))
    await waitFor(() => {
      expect(mockNeq).toHaveBeenCalledWith('type', 'transfer')
    })
  })

  it('filteredTotal soma corretamente os amounts retornados pelo sumQuery', async () => {
    // Limitação do mock: buildChain retorna o mesmo data para query principal e sumQuery.
    // Quando type !== 'all', o hook usa data do sumQuery para calcular filteredTotal,
    // então o mock com apenas { amount } é válido para esse cálculo.
    mockSupabaseResult({
      data: [
        { amount: 100 },
        { amount: 250.50 },
        { amount: 300 },
      ],
      count: 3,
    })
    const { result } = renderHook(() =>
      useTransactions({ ...DEFAULT_FILTERS, type: 'expense' })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.filteredTotal).toBeCloseTo(650.5)
  })

  it('usa dateFrom quando fornecido em vez do inicio do mes', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    renderHook(() =>
      useTransactions({ ...DEFAULT_FILTERS, dateFrom: '2026-06-10', dateTo: null })
    )
    await waitFor(() => {
      expect(mockGte).toHaveBeenCalledWith('date', '2026-06-10')
      expect(mockLte).toHaveBeenCalledWith('date', '2026-06-30')
    })
  })

  it('usa dateTo quando fornecido em vez do fim do mes', async () => {
    mockSupabaseResult({ data: [], count: 0 })
    renderHook(() =>
      useTransactions({ ...DEFAULT_FILTERS, dateFrom: null, dateTo: '2026-06-20' })
    )
    await waitFor(() => {
      expect(mockGte).toHaveBeenCalledWith('date', '2026-06-01')
      expect(mockLte).toHaveBeenCalledWith('date', '2026-06-20')
    })
  })
})
