import { useState, useEffect } from 'react'
import { CheckCircle2, RefreshCw, Trash2 } from 'lucide-react'
import { fetchAllDuplicateGroups, deleteTransaction } from '@/hooks/useDuplicateCheck'
import type { Transaction, TransactionType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function typeLabel(type: TransactionType) {
  if (type === 'income') return 'Receita'
  if (type === 'expense') return 'Despesa'
  return 'Transferência'
}

function amountColor(type: TransactionType) {
  if (type === 'income') return 'text-green-500'
  if (type === 'expense') return 'text-red-500'
  return 'text-blue-400'
}

function amountPrefix(type: TransactionType) {
  if (type === 'income') return '+'
  if (type === 'expense') return '-'
  return ''
}

function groupKey(group: Transaction[]): string {
  const tx = group[0]
  return `${tx.type}|${tx.amount}|${tx.date}|${tx.description?.toLowerCase().trim()}`
}

export default function Duplicates() {
  const [groups, setGroups] = useState<Transaction[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAllDuplicateGroups()
      setGroups(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function resolveDuplicate(_groupKey: string, removeId: string): Promise<boolean> {
    setResolving(removeId)
    try {
      setError(null)
      await deleteTransaction(removeId)
      setGroups((prev) =>
        prev.map((g) => g.filter((tx) => tx.id !== removeId)).filter((g) => g.length >= 2)
      )
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setResolving(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-100">Transações Duplicadas</h1>
          {!loading && (
            <Badge variant="outline" className="bg-indigo-950 border-indigo-800 text-indigo-300 text-xs">
              {groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}
            </Badge>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && groups.length === 0 && (
        <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-12 flex flex-col items-center gap-4">
          <CheckCircle2 size={40} className="text-green-500" />
          <p className="text-slate-300 text-sm text-center">
            Nenhuma duplicata encontrada. Sua base está limpa!
          </p>
        </div>
      )}

      {/* Groups list */}
      {!loading && groups.map((group) => {
        const key = groupKey(group)
        const representative = group[0]

        return (
          <div key={key} className="bg-[#1a1d27] border border-[#2d3148] rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#2d3148]">
              <Badge variant="outline" className="bg-red-950 border-red-800 text-red-400 text-xs">
                {group.length} duplicatas
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {typeLabel(representative.type)}
              </Badge>
              <span className={`font-semibold text-sm ${amountColor(representative.type)}`}>
                {amountPrefix(representative.type)}{formatCurrency(representative.amount)}
              </span>
              <span className="text-slate-400 text-sm">{formatDate(representative.date)}</span>
              {representative.description && (
                <span className="text-slate-300 text-sm truncate max-w-xs">{representative.description}</span>
              )}
            </div>

            {/* Inner table */}
            <Table>
              <TableHeader>
                <TableRow className="border-[#2d3148] hover:bg-transparent">
                  <TableHead className="text-slate-400">Conta</TableHead>
                  <TableHead className="text-slate-400">Categoria</TableHead>
                  <TableHead className="text-slate-400">Data de criação</TableHead>
                  <TableHead className="text-slate-400 w-40">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.map((tx) => {
                  const others = group.filter((t) => t.id !== tx.id)
                  const isRemovingOther = !!resolving && others.some((o) => o.id === resolving)

                  return (
                    <TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
                      <TableCell className="text-slate-300 text-sm">
                        {tx.accounts ? (
                          <span className="flex items-center gap-1">
                            <span>{tx.accounts.icon}</span>
                            <span>{tx.accounts.name}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {tx.categories ? `${tx.categories.icon} ${tx.categories.name}` : '—'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {tx.created_at ? formatDate(tx.created_at.slice(0, 10)) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!!resolving}
                          className="text-xs text-indigo-400 hover:text-indigo-200 gap-1.5"
                          onClick={async () => {
                            for (const other of others) {
                              const ok = await resolveDuplicate(key, other.id)
                              if (!ok) break
                            }
                          }}
                        >
                          <Trash2 size={12} />
                          {isRemovingOther ? 'Removendo...' : 'Manter esta'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )
      })}

      {/* Footer */}
      {!loading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            className="text-slate-400 hover:text-slate-200 gap-2"
          >
            <RefreshCw size={14} />
            Atualizar
          </Button>
        </div>
      )}
    </div>
  )
}
