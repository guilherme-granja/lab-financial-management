import { vi } from 'vitest'

export const mockFrom = vi.fn()
export const mockSelect = vi.fn()
export const mockInsert = vi.fn()
export const mockUpdate = vi.fn()
export const mockDelete = vi.fn()
export const mockEq = vi.fn()
export const mockGte = vi.fn()
export const mockLte = vi.fn()
export const mockLike = vi.fn()
export const mockOrder = vi.fn()
export const mockRange = vi.fn()
export const mockNeq = vi.fn()
export const mockOr = vi.fn()
export const mockLimit = vi.fn()

type MockFn = ReturnType<typeof vi.fn>

const namedMocks: Record<string, MockFn> = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  gte: mockGte,
  lte: mockLte,
  like: mockLike,
  order: mockOrder,
  range: mockRange,
  neq: mockNeq,
  or: mockOr,
  limit: mockLimit,
}

function buildChain(finalResult: { data?: unknown; error?: unknown; count?: number }) {
  const thenFn = (resolve: (v: unknown) => void) => {
    resolve(finalResult)
    return Promise.resolve(finalResult)
  }

  const chain: Record<string, unknown> = { then: thenFn }

  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'lt', 'gt',
    'like', 'ilike', 'in', 'is', 'or', 'not',
    'order', 'range', 'limit', 'single',
  ]

  for (const m of methods) {
    const fn: MockFn = namedMocks[m] ?? vi.fn()
    fn.mockImplementation(() => chain)
    chain[m] = fn
  }

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

export function useSupabaseClient() {
  return supabase
}

export const choreClient = supabase
