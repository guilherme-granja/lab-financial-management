import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAccountReset } from './useAccountReset'
import { mockFrom } from '@/test/mocks/supabase'

vi.mock('@/hooks/useDatabase', () => import('@/test/mocks/supabase'))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))

const logActivityMock = vi.fn()
vi.mock('@/lib/activity-log', () => ({
  logActivity: (...args: unknown[]) => logActivityMock(...args),
}))

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

describe('useAccountReset', () => {
  it('fluxo completo com sucesso: verificação zera as 3 contagens', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return chainResult({ data: [{ id: 't1' }, { id: 't2' }], count: 0 })
      }
      if (table === 'monthly_budgets') {
        return chainResult({ data: [{ id: 'b1' }], count: 0 })
      }
      if (table === 'accounts') {
        return chainResult({ data: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }], count: 0 })
      }
      if (table === 'recurrence_groups') {
        return chainResult({ data: null })
      }
      return chainResult({ data: null, count: 0 })
    })

    const { result } = renderHook(() => useAccountReset())

    await act(async () => {
      await result.current.resetAccount()
    })

    await waitFor(() => expect(result.current.step).toBe('done'))
    expect(result.current.summary).toEqual({
      transactionsDeleted: 2,
      budgetsDeleted: 1,
      accountsDeleted: 3,
    })
    expect(result.current.remaining).toBeNull()
    expect(logActivityMock).toHaveBeenCalledWith('user-1', 'account_data_reset', {
      transactions_deleted: 2,
      budgets_deleted: 1,
      accounts_deleted: 3,
    })
  })

  it('fluxo com resíduo: verificação de accounts retorna count 2', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return chainResult({ data: [], count: 0 })
      }
      if (table === 'monthly_budgets') {
        return chainResult({ data: [], count: 0 })
      }
      if (table === 'accounts') {
        return chainResult({ data: [], count: 2 })
      }
      if (table === 'recurrence_groups') {
        return chainResult({ data: null })
      }
      return chainResult({ data: null, count: 0 })
    })

    const { result } = renderHook(() => useAccountReset())

    await act(async () => {
      await result.current.resetAccount()
    })

    await waitFor(() => expect(result.current.step).toBe('partial'))
    expect(result.current.remaining).toEqual({
      transactions: 0,
      budgets: 0,
      accounts: 2,
    })
    expect(logActivityMock).not.toHaveBeenCalled()
  })
})
