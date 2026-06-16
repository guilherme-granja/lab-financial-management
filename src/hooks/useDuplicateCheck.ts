import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'
import { startOfMonth, endOfMonth, format } from 'date-fns'

// Camada 1: verifica se já existe transação com os mesmos 4 campos no mesmo mês.
// Retorna a transação duplicada encontrada ou null.
export async function checkDuplicate(params: {
  type: string
  amount: number
  date: string        // 'yyyy-MM-dd'
  description: string
  excludeId?: string  // ao editar, excluir a própria transação da busca
}): Promise<Transaction | null> {
  if (!params.description?.trim()) return null // sem descrição: nunca duplicata

  const ref = new Date(params.date)
  const dateStart = format(startOfMonth(ref), 'yyyy-MM-dd')
  const dateEnd   = format(endOfMonth(ref),   'yyyy-MM-dd')

  let query = supabase
    .from('transactions')
    .select('*, categories(*), accounts!account_id(*)')
    .eq('type', params.type)
    .eq('amount', params.amount)
    .eq('date', params.date)
    .ilike('description', params.description.trim())  // case-insensitive
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .limit(1)

  if (params.excludeId) {
    query = query.neq('id', params.excludeId)
  }

  const { data } = await query
  return data?.[0] ?? null
}

// Camada 2: busca todos os grupos de duplicatas no banco.
// Retorna grupos com 2+ transações idênticas (type+amount+date+description).
// Agrupamento feito no client para evitar RPC/stored procedure.
export async function fetchAllDuplicateGroups(): Promise<Transaction[][]> {
  // Busca apenas transações com descrição (sem descrição nunca são duplicatas)
  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(*), accounts!account_id(*)')
    .not('description', 'is', null)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  // Agrupa por chave composta no client
  const map = new Map<string, Transaction[]>()
  for (const tx of data as Transaction[]) {
    const key = `${tx.type}|${tx.amount}|${tx.date}|${tx.description?.toLowerCase().trim()}`
    const group = map.get(key) ?? []
    group.push(tx)
    map.set(key, group)
  }

  // Retorna apenas grupos com 2+ transações
  return Array.from(map.values()).filter((g) => g.length >= 2)
}

export function useDuplicateCheck() {
  return { checkDuplicate, fetchAllDuplicateGroups }
}
