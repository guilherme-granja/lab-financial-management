import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Copy,
  Tag,
  Tags,
  Wallet,
  X,
  LogOut,
  Users,
  Database,
  Activity,
  PiggyBank,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/duplicates', label: 'Duplicidades', icon: Copy },
  { to: '/accounts', label: 'Contas', icon: Wallet },
  { to: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/tags', label: 'Tags', icon: Tags },
]

interface SidebarProps {
  onClose?: () => void
}

function LogoBlock() {
  return (
    <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2d3148]">
      <div className="flex-shrink-0">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#1e1b4b"/>
          <rect x="6" y="18" width="4" height="8" rx="1" fill="#6366f1"/>
          <rect x="12" y="12" width="4" height="14" rx="1" fill="#818cf8"/>
          <rect x="18" y="8" width="4" height="18" rx="1" fill="#a5b4fc"/>
          <rect x="24" y="14" width="4" height="12" rx="1" fill="#eab308"/>
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-white font-bold text-base tracking-tight">
          Lab <span className="font-light">Financas</span>
        </span>
        <span className="text-slate-500 text-[10px] tracking-[0.15em] uppercase">Pessoal</span>
      </div>
    </div>
  )
}

function NavItems({ onClose }: SidebarProps) {
  const { isAdmin } = useAuth()

  if (isAdmin) {
    return (
      <nav className="flex flex-col gap-1 p-4">
        <NavLink
          to="/admin"
          end
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#252838]'
            )
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink
          to="/admin/users"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#252838]'
            )
          }
        >
          <Users size={18} />
          Usuários
        </NavLink>
        <NavLink
          to="/admin/databases"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#252838]'
            )
          }
        >
          <Database size={18} />
          Databases
        </NavLink>
        <NavLink
          to="/admin/activity"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#252838]'
            )
          }
        >
          <Activity size={18} />
          Atividade
        </NavLink>
      </nav>
    )
  }

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

function SidebarFooter({ onSignOut, onClose }: { onSignOut: () => void; onClose?: () => void }) {
  return (
    <div className="mt-auto">
      <Separator className="bg-[#2d3148]" />
      <div className="p-4 space-y-1">
        <NavLink
          to="/profile"
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
          <User size={18} />
          Meu Perfil
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-950/30 px-3"
          onClick={onSignOut}
        >
          <LogOut size={18} />
          Sair
        </Button>
      </div>
    </div>
  )
}

interface SidebarDrawerProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarDrawerProps) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 bg-[#1a1d27] border-r border-[#2d3148] transition-transform duration-200 md:hidden flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-[#2d3148]">
          <div className="flex-1">
            <LogoBlock />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 mr-2"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>
        <NavItems onClose={onClose} />
        <SidebarFooter onSignOut={() => { signOut(); onClose() }} onClose={onClose} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1a1d27] border-r border-[#2d3148] fixed top-0 left-0 h-full">
        <LogoBlock />
        <NavItems />
        <SidebarFooter onSignOut={signOut} />
      </aside>
    </>
  )
}
