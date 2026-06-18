import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      setTags((data as Tag[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createTag = async (name: string): Promise<void> => {
    // Check for duplicate before inserting
    const { data: existing, error: queryErr } = await supabase
      .from('tags')
      .select('id')
      .eq('name', name)
      .single()

    if (queryErr && queryErr.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected), any other error should be thrown
      throw new Error(queryErr.message)
    }

    if (existing) {
      throw new Error('Tag já existe')
    }

    const { error: err } = await supabase
      .from('tags')
      .insert({ name })

    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteTag = async (id: string): Promise<void> => {
    const { error: err } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)

    if (err) throw new Error(err.message)
    await fetch()
  }

  async function addTagToTransaction(transactionId: string, tagId: string): Promise<void> {
    const { error: err } = await supabase
      .from('transaction_tags')
      .insert({ transaction_id: transactionId, tag_id: tagId })
    if (err) throw new Error(err.message)
  }

  async function removeTagFromTransaction(transactionId: string, tagId: string): Promise<void> {
    const { error: err } = await supabase
      .from('transaction_tags')
      .delete()
      .eq('transaction_id', transactionId)
      .eq('tag_id', tagId)
    if (err) throw new Error(err.message)
  }

  async function setTransactionTags(transactionId: string, tagIds: string[]): Promise<void> {
    // Deleta todos os vínculos existentes e reinsere os novos (upsert completo)
    await supabase.from('transaction_tags').delete().eq('transaction_id', transactionId)
    if (tagIds.length === 0) return
    const rows = tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id }))
    const { error: err } = await supabase.from('transaction_tags').insert(rows)
    if (err) throw new Error(err.message)
  }

  return { tags, loading, error, createTag, deleteTag, addTagToTransaction, removeTagFromTransaction, setTransactionTags }
}
