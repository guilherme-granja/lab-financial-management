interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center justify-between px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
    </header>
  )
}
