import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useGoals } from './useGoals'
import { mockSupabaseResult } from '@/test/mocks/supabase'

vi.mock('@/hooks/useDatabase', () => import('@/test/mocks/supabase'))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useGoals', () => {
  it('inicia com loading=true', () => {
    mockSupabaseResult({ data: [] })
    const { result } = renderHook(() => useGoals())
    expect(result.current.loading).toBe(true)
  })

  it('retorna metas sem erros', async () => {
    const goal = {
      id: '1',
      category_id: 'cat-1',
      amount: 1000,
      period_type: 'monthly' as const,
      period_start: '2026-06',
      created_at: '',
      categories: {
        id: 'cat-1',
        name: 'Alimentação',
        color: '#ef4444',
        icon: '🍔',
        type: 'expense' as const,
        created_at: '',
      },
    }
    mockSupabaseResult({ data: [goal] })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].id).toBe('1')
  })

  it('calcula progress e actual para cada meta', async () => {
    const goal = {
      id: '1',
      category_id: 'cat-1',
      amount: 1000,
      period_type: 'monthly' as const,
      period_start: '2026-06',
      created_at: '',
      categories: {
        id: 'cat-1',
        name: 'Alimentação',
        color: '#ef4444',
        icon: '🍔',
        type: 'expense' as const,
        created_at: '',
      },
    }
    mockSupabaseResult({ data: [goal] })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const resultGoal = result.current.goals[0]
    expect(resultGoal).toHaveProperty('actual')
    expect(resultGoal).toHaveProperty('progress')
    expect(typeof resultGoal.actual).toBe('number')
    expect(typeof resultGoal.progress).toBe('number')
    expect(resultGoal.actual).toBeGreaterThanOrEqual(0)
    expect(resultGoal.progress).toBeGreaterThanOrEqual(0)
  })

  it('calcula progress=0 quando amount=0', async () => {
    const goal = {
      id: '1',
      category_id: 'cat-1',
      amount: 0,
      period_type: 'monthly' as const,
      period_start: '2026-06',
      created_at: '',
    }
    mockSupabaseResult({ data: [goal] })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.goals).toHaveLength(1)
    expect(result.current.goals[0].progress).toBe(0)
  })

  it('seta error quando Supabase retorna erro', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Database error' } })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Database error')
    expect(result.current.goals).toHaveLength(0)
  })

  it('createGoal lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Insert failed' } })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.createGoal({
        category_id: 'cat-1',
        amount: 500,
        period_type: 'monthly',
        period_start: '2026-06',
      })
    ).rejects.toThrow('Insert failed')
  })

  it('updateGoal lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Update failed' } })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.updateGoal('1', { amount: 2000 })).rejects.toThrow(
      'Update failed'
    )
  })

  it('deleteGoal lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Delete failed' } })
    const { result } = renderHook(() => useGoals())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.deleteGoal('1')).rejects.toThrow('Delete failed')
  })
})
