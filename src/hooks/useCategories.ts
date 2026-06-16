import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, CategoryType } from '@/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (err) {
      setError(err.message)
    } else {
      setCategories((data as Category[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const categoryTree = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id === null)
    const children = categories.filter((c) => c.parent_id !== null)
    return parents.map((p) => ({
      ...p,
      subcategories: children.filter((c) => c.parent_id === p.id),
    }))
  }, [categories])

  const createCategory = async (payload: {
    name: string
    color: string
    icon: string
    type: CategoryType
    parent_id?: string | null
  }) => {
    const { error: err } = await supabase.from('categories').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateCategory = async (
    id: string,
    payload: Partial<{ name: string; color: string; icon: string; type: CategoryType; parent_id: string | null }>
  ) => {
    const { error: err } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteCategory = async (id: string) => {
    const { error: err } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const checkCategoryUsage = async (id: string): Promise<number> => {
    const { count, error } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  const deleteCategoryWithTransfer = async (id: string, targetCategoryId: string): Promise<void> => {
    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ category_id: targetCategoryId })
      .eq('category_id', id)
    if (updateErr) throw new Error(updateErr.message)
    await deleteCategory(id)
  }

  return {
    categories,
    categoryTree,
    loading,
    error,
    refresh: fetch,
    createCategory,
    updateCategory,
    deleteCategory,
    checkCategoryUsage,
    deleteCategoryWithTransfer,
  }
}
