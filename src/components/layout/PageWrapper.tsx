import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/categories': 'Categorias',
  '/budgets': 'Orçamentos',
  '/admin/users': 'Usuários',
  '/admin': 'Dashboard Admin',
  '/admin/activity': 'Logs de Atividade',
  '/perfil': 'Meu Perfil',
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
        <footer className="border-t border-[#2d3148] px-6 py-3 flex items-center justify-end">
          <span className="text-slate-600 text-xs font-mono">
            v{__APP_VERSION__}
          </span>
        </footer>
      </div>
    </div>
  )
}
