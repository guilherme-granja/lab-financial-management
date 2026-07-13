import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useTransactionSearch, type TransactionSearchResult } from '@/hooks/useTransactionSearch'

interface TransactionSearchInputProps {
  onSelectResult: (result: TransactionSearchResult) => void
}

const AMOUNT_COLOR: Record<TransactionSearchResult['type'], string> = {
  income: 'text-green-500',
  expense: 'text-red-500',
  transfer: 'text-blue-400',
}

const AMOUNT_SIGN: Record<TransactionSearchResult['type'], string> = {
  income: '+',
  expense: '-',
  transfer: '',
}

export function TransactionSearchInput({ onSelectResult }: TransactionSearchInputProps) {
  const { query, setQuery, results, loading } = useTransactionSearch()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleSelect = (result: TransactionSearchResult) => {
    onSelectResult(result)
    setQuery('')
    setOpen(false)
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar transação..."
        className="pl-10 bg-[#0f1117] border-[#2d3148] text-slate-200 h-9"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d27] border border-[#2d3148] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading && <p className="text-slate-500 text-sm px-4 py-3">Buscando...</p>}

          {!loading && results.length === 0 && (
            <p className="text-slate-500 text-sm px-4 py-3">Nenhuma transação encontrada.</p>
          )}

          {!loading &&
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#2d3148] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-slate-200 text-sm truncate">{result.description ?? '—'}</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    {formatDate(result.date)}
                    {result.category_name && (
                      <>
                        <span>·</span>
                        {result.category_icon && <span>{result.category_icon}</span>}
                        <span>{result.category_name}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-medium ${AMOUNT_COLOR[result.type]}`}>
                  {AMOUNT_SIGN[result.type]}
                  {formatCurrency(result.amount)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
