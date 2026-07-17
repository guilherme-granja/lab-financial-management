import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { TransactionSearchInput } from '@/components/layout/transaction-search-input'
import type { TransactionSearchResult } from '@/hooks/useTransactionSearch'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  onMenuClick: () => void
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSelectResult = (result: TransactionSearchResult) => {
    const month = result.date.slice(0, 7)
    navigate(`/transactions?transactionId=${result.id}&month=${month}`)
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[#2d3148] flex items-center gap-2 md:gap-4 px-3 md:px-6 bg-[#1a1d27]">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-slate-400 flex-shrink-0"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </Button>

      <h1 className="text-white font-semibold text-lg flex-1 text-center md:text-left md:shrink-0 md:flex-none truncate">
        {title}
      </h1>

      {!isAdmin && (
        <div className="hidden md:flex flex-1 justify-end">
          <TransactionSearchInput onSelectResult={handleSelectResult} />
        </div>
      )}

      <div className="w-10 md:hidden flex-shrink-0" aria-hidden="true" />
    </header>
  )
}
