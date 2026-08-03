import { renderHook, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useBlogPosts } from './useBlogPosts'
import { mockFrom } from '@/test/mocks/supabase'

vi.mock('@/lib/chore-client', () => import('@/test/mocks/supabase'))

beforeEach(() => {
  vi.clearAllMocks()
})

function chainResult(result: { data?: unknown; error?: unknown }) {
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

describe('useBlogPosts', () => {
  it('carrega posts sem query', async () => {
    const posts = [
      { id: '1', slug: 'a', title: 'A', excerpt: 'e', content: 'c', related_screen: null, published_at: '2026-01-01', created_at: '2026-01-01' },
    ]
    mockFrom.mockReturnValue(chainResult({ data: posts }))

    const { result } = renderHook(() => useBlogPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.posts).toEqual(posts)
    expect(result.current.error).toBeNull()
  })

  it('aplica filtro ILIKE quando query tem 2+ caracteres', async () => {
    const chain = chainResult({ data: [] })
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() => useBlogPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setQuery('or'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(chain.or).toHaveBeenCalledWith('title.ilike.%or%,content.ilike.%or%')
  })

  it('não filtra com query de 1 caractere', async () => {
    const chain = chainResult({ data: [] })
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() => useBlogPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setQuery('o'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(chain.or).not.toHaveBeenCalled()
  })

  it('propaga erro do Supabase para error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'falha na consulta' } }))

    const { result } = renderHook(() => useBlogPosts())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('falha na consulta')
    expect(result.current.posts).toEqual([])
  })
})
