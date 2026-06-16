import { vi } from 'vitest'

export const mockFrom = vi.fn()
export const mockSelect = vi.fn()
export const mockInsert = vi.fn()
export const mockUpdate = vi.fn()
export const mockDelete = vi.fn()
export const mockEq = vi.fn()
export const mockGte = vi.fn()
export const mockLte = vi.fn()
export const mockOrder = vi.fn()
export const mockRange = vi.fn()
export const mockNeq = vi.fn()
export const mockOr = vi.fn()
export const mockLimit = vi.fn()

// Chainable builder to simulate supabase-js query builder
function buildChain(finalResult: object) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'lt', 'gt',
    'like', 'ilike', 'in', 'is', 'or', 'not',
    'order', 'range', 'limit', 'single',
  ]
  for (const m of methods) {
    chain[m] = vi.fn(() => ({ ...chain, then: thenFn }))
  }
  const thenFn = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(finalResult))
  Object.assign(chain, { then: thenFn })
  return chain
}

export function mockSupabaseResult(result: { data?: unknown; error?: unknown; count?: number }) {
  const chain = buildChain(result)
  mockFrom.mockReturnValue(chain)
  return chain
}

export const supabase = {
  from: mockFrom,
  auth: {
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
}
