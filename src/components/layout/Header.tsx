import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { TransactionSearchInput } from '@/components/layout/transaction-search-input'
import type { TransactionSearchResult } from '@/hooks/useTransactionSearch'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSelectResult = (result: TransactionSearchResult) => {
    const month = result.date.slice(0, 7)
    navigate(`/transactions?month=${month}&highlight=${result.id}`)
  }

  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center justify-between gap-4 px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg shrink-0">{title}</h1>
      {!isAdmin && (
        <div className="flex-1 flex justify-end">
          <TransactionSearchInput onSelectResult={handleSelectResult} />
        </div>
      )}
    </header>
  )
}
