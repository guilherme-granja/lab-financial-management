import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Copy,
  Tag,
  Tags,
  BarChart2,
  Target,
  Wallet,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/duplicates', label: 'Duplicidades', icon: Copy },
  { to: '/accounts', label: 'Contas', icon: Wallet },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/reports', label: 'Relatórios', icon: BarChart2 },
  { to: '/goals', label: 'Metas', icon: Target },
]

interface SidebarProps {
  onClose?: () => void
}

function NavItems({ onClose }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-slate-400"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={20} />
      </Button>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 bg-[#1a1d27] border-r border-[#2d3148] transition-transform duration-200 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2d3148]">
          <span className="text-white font-semibold">Finanças</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </Button>
        </div>
        <NavItems onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1a1d27] border-r border-[#2d3148] fixed top-0 left-0 h-full">
        <div className="p-6 border-b border-[#2d3148]">
          <span className="text-white font-bold text-lg">💰 Finanças</span>
        </div>
        <NavItems />
      </aside>
    </>
  )
}
