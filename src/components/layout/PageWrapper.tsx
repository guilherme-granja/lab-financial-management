import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/categories': 'Categorias',
  '/reports': 'Relatórios',
  '/goals': 'Metas',
}

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
