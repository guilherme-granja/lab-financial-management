import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  id?: string
}

export function MoneyInput({ value, onChange, className, id }: MoneyInputProps) {
  const [cents, setCents] = useState(() => Math.round(Math.abs(value) * 100))
  const inputRef = useRef<HTMLInputElement>(null)

  function formatted(c: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(c / 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (/^\d$/.test(e.key)) {
      const next = Math.min(cents * 10 + parseInt(e.key), 99_999_999_99)
      setCents(next)
      onChange(next / 100)
    } else if (e.key === 'Backspace') {
      const next = Math.floor(cents / 10)
      setCents(next)
      onChange(next / 100)
    } else if (e.key === 'Delete') {
      setCents(0)
      onChange(0)
    }
    e.preventDefault()
  }

  function handleFocus() {
    inputRef.current?.select()
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={formatted(cents)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onChange={() => {}}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'tabular-nums',
        className,
      )}
    />
  )
}
