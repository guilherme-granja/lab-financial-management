import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  selectedMonth: Date
  onMonthChange: (d: Date) => void
  showMonthPicker?: boolean
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function Header({ title, selectedMonth, onMonthChange, showMonthPicker = true }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center justify-between px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
      {showMonthPicker && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400"
            onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-slate-200 text-sm font-medium w-28 text-center select-none">
            {capitalize(format(selectedMonth, 'MMMM yyyy', { locale: ptBR }))}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400"
            onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </header>
  )
}
