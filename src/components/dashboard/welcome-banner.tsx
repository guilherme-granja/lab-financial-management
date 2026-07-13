import { Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface WelcomeBannerProps {
  name: string
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  return (
    <Card className="bg-[#1a1d27] border-[#2d3148]">
      <CardContent className="p-6 flex items-center gap-4">
        <div className="w-11 h-11 shrink-0 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Sparkles size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-slate-200 font-semibold text-lg">Fala, {name}!</h2>
          <p className="text-slate-500 text-sm">Bora ver se as contas estão se comportando esse mês?</p>
        </div>
      </CardContent>
    </Card>
  )
}
