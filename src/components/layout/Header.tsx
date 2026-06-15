import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { signOut } = useAuth()

  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center justify-between px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="text-slate-400 hover:text-slate-200 gap-2"
      >
        <LogOut size={16} />
        Sair
      </Button>
    </header>
  )
}
