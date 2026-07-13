import { getPasswordStrength } from '@/lib/password-rules'

interface PasswordStrengthBarProps {
  password: string
}

const BAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500']
const LABEL_COLORS = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-emerald-400']

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { score, total, label } = getPasswordStrength(password)
  const filledIndex = Math.max(0, score - 1)

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < score ? BAR_COLORS[filledIndex] : 'bg-[#2d3148]'
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`text-xs ${LABEL_COLORS[filledIndex]}`}>{label}</p>
      )}
    </div>
  )
}
