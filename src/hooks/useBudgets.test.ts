import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useBudgets, calculateStatus } from './useBudgets'
import { mockFrom } from '@/test/mocks/supabase'

vi.mock('@/hooks/useDatabase', () => import('@/test/mocks/supabase'))

beforeEach(() => {
  vi.clearAllMocks()
})

function chainResult(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void) => {
      resolve(result)
      return Promise.resolve(result)
    },
  }
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'lt', 'gt',
    'like', 'ilike', 'in', 'is', 'or', 'not',
    'order', 'range', 'limit', 'single', 'maybeSingle',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  return chain
}

describe('calculateStatus', () => {
  it('modo normal: ratio <= 0.5 é verde', () => {
    expect(calculateStatus(10, 40, 'normal')).toBe('verde')
    expect(calculateStatus(20, 40, 'normal')).toBe('verde') // ratio = 0.5 exato
  })

  it('modo normal: 0.5 < ratio <= 1 é amarelo', () => {
    expect(calculateStatus(30, 40, 'normal')).toBe('amarelo') // ratio = 0.75
    expect(calculateStatus(40, 40, 'normal')).toBe('amarelo') // ratio = 1 exato
  })

  it('modo normal: ratio > 1 é vermelho', () => {
    expect(calculateStatus(41, 40, 'normal')).toBe('vermelho')
  })

  it('modo inverso: ratio >= 1 é verde', () => {
    expect(calculateStatus(40, 40, 'inverse')).toBe('verde') // ratio = 1 exato
    expect(calculateStatus(50, 40, 'inverse')).toBe('verde')
  })

  it('modo inverso: 0.5 <= ratio < 1 é amarelo', () => {
    expect(calculateStatus(20, 40, 'inverse')).toBe('amarelo') // ratio = 0.5 exato
    expect(calculateStatus(30, 40, 'inverse')).toBe('amarelo')
  })

  it('modo inverso: ratio < 0.5 é vermelho', () => {
    expect(calculateStatus(10, 40, 'inverse')).toBe('vermelho')
  })

  it('targetPct null retorna neutro', () => {
    expect(calculateStatus(50, null, 'normal')).toBe('neutro')
    expect(calculateStatus(50, null, 'inverse')).toBe('neutro')
  })

  it('targetPct 0 retorna neutro', () => {
    expect(calculateStatus(50, 0, 'normal')).toBe('neutro')
  })
})

describe('useBudgets', () => {
  it('summary é null quando não há config pro mês', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null }))
    const { result } = renderHook(() => useBudgets('2026-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.budgetConfig).toBeNull()
    expect(result.current.summary).toBeNull()
  })

  it('calcula summary a partir de config e transações do mês', async () => {
    const config = {
      id: 'cfg-1',
      month: '2026-06',
      preset: '50_30_20' as const,
      needs_pct: 50,
      leisure_pct: 30,
      savings_pct: 20,
      created_at: '2026-06-01',
    }
    const incomeRows = [
      { amount: 1000, apply_budget: true },
      { amount: 200, apply_budget: false },
    ]
    const expenseRows = [
      { amount: 400, budget_bucket: 'needs' },
      { amount: 300, budget_bucket: 'leisure' },
      { amount: 100, budget_bucket: null },
    ]

    mockFrom
      .mockReturnValueOnce(chainResult({ data: config }))
      .mockReturnValueOnce(chainResult({ data: incomeRows }))
      .mockReturnValueOnce(chainResult({ data: expenseRows }))

    const { result } = renderHook(() => useBudgets('2026-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const summary = result.current.summary
    expect(summary).not.toBeNull()
    expect(summary!.base).toBe(1000)
    expect(summary!.needs.amount).toBe(400)
    expect(summary!.needs.pct).toBe(40)
    expect(summary!.leisure.amount).toBe(300)
    expect(summary!.leisure.pct).toBe(30)
    expect(summary!.unclassified.amount).toBe(100)
    expect(summary!.unclassified.status).toBe('neutro')
    // savings = base - needs - leisure - unclassified = 1000 - 400 - 300 - 100 = 200
    expect(summary!.savings.amount).toBe(200)
    expect(summary!.savings.pct).toBe(20)
    expect(summary!.unclassifiedExpenseCount).toBe(1)
    expect(summary!.unflaggedIncomeCount).toBe(1)
    expect(summary!.unflaggedIncomeAmount).toBe(200)
  })

  it('upsertBudgetConfig lança erro se Supabase falhar', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null }))
    const { result } = renderHook(() => useBudgets('2026-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'upsert failed' } }))
    await expect(
      result.current.upsertBudgetConfig('2026-06', { preset: 'custom', needs_pct: 50, leisure_pct: 30, savings_pct: 20 })
    ).rejects.toThrow('upsert failed')
  })
})
