import { CheckCircle2 } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from '@/lib/password-rules'

interface PasswordRulesHintProps {
  password: string
}

export function PasswordRulesHint({ password }: PasswordRulesHintProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password)
        return (
          <div
            key={req.key}
            className={`flex items-center gap-2 text-xs transition-colors ${
              met ? 'text-[#4edea3]' : 'text-slate-500'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{req.label}</span>
          </div>
        )
      })}
    </div>
  )
}
