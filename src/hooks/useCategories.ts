import { useState, useEffect, useCallback } from 'react'
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

  const createCategory = async (payload: {
    name: string
    color: string
    icon: string
    type: CategoryType
  }) => {
    const { error: err } = await supabase.from('categories').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateCategory = async (
    id: string,
    payload: Partial<{ name: string; color: string; icon: string; type: CategoryType }>
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

  return {
    categories,
    loading,
    error,
    refresh: fetch,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
