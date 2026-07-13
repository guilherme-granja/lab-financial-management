import { createContext, useContext, useState, ReactNode } from 'react'
import { format } from 'date-fns'

interface SelectedMonthContextValue {
  month: string
  setMonth: (month: string) => void
}

const SelectedMonthContext = createContext<SelectedMonthContextValue | undefined>(undefined)

export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  return (
    <SelectedMonthContext.Provider value={{ month, setMonth }}>
      {children}
    </SelectedMonthContext.Provider>
  )
}

export function useSelectedMonth(): SelectedMonthContextValue {
  const ctx = useContext(SelectedMonthContext)
  if (!ctx) throw new Error('useSelectedMonth must be used within SelectedMonthProvider')
  return ctx
}
