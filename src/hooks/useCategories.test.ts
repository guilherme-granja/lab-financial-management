import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useCategories } from './useCategories'
import { mockSupabaseResult } from '@/test/mocks/supabase'

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCategories', () => {
  it('inicia com loading=true', () => {
    mockSupabaseResult({ data: [] })
    const { result } = renderHook(() => useCategories())
    expect(result.current.loading).toBe(true)
  })

  it('retorna categorias ordenadas por nome', async () => {
    const categories = [
      {
        id: '1',
        name: 'Alimentação',
        type: 'expense' as const,
        color: '#ef4444',
        icon: '🍔',
        created_at: '',
      },
      {
        id: '2',
        name: 'Transporte',
        type: 'expense' as const,
        color: '#3b82f6',
        icon: '🚗',
        created_at: '',
      },
    ]
    mockSupabaseResult({ data: categories })
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.categories).toHaveLength(2)
    expect(result.current.categories[0].name).toBe('Alimentação')
    expect(result.current.categories[1].name).toBe('Transporte')
  })

  it('seta error quando Supabase retorna erro', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Database error' } })
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Database error')
    expect(result.current.categories).toHaveLength(0)
  })

  it('createCategory lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Insert failed' } })
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.createCategory({
        name: 'Nova Categoria',
        color: '#fff000',
        icon: '💡',
        type: 'expense',
      })
    ).rejects.toThrow('Insert failed')
  })

  it('updateCategory lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Update failed' } })
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(
      result.current.updateCategory('1', { name: 'Categoria Atualizada' })
    ).rejects.toThrow('Update failed')
  })

  it('deleteCategory lança erro se Supabase falhar', async () => {
    mockSupabaseResult({ data: null, error: { message: 'Delete failed' } })
    const { result } = renderHook(() => useCategories())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await expect(result.current.deleteCategory('1')).rejects.toThrow('Delete failed')
  })
})
