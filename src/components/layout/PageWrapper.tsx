import { createContext, useContext, useState, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface SelectedMonthContextValue {
  selectedMonth: Date
  setSelectedMonth: (d: Date) => void
}

export const SelectedMonthContext = createContext<SelectedMonthContextValue>({
  selectedMonth: new Date(),
  setSelectedMonth: () => {},
})

export function useSelectedMonth() {
  return useContext(SelectedMonthContext)
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/categories': 'Categorias',
  '/reports': 'Relatórios',
  '/goals': 'Metas',
  '/admin/users': 'Usuários',
}

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  return (
    <SelectedMonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      <div className="min-h-screen bg-[#0f1117]">
        <Sidebar />
        <div className="md:ml-64 flex flex-col min-h-screen">
          <Header
            title={title}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
          <main className="flex-1 p-6">{children}</main>
          <footer className="border-t border-[#2d3148] px-6 py-3 flex items-center justify-end">
            <span className="text-slate-600 text-xs font-mono">
              v{__APP_VERSION__}
            </span>
          </footer>
        </div>
      </div>
    </SelectedMonthContext.Provider>
  )
}
