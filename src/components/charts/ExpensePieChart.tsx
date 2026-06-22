import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface PieDataPoint {
  name: string
  value: number
  color: string
}

interface Props {
  data: PieDataPoint[]
}

export function ExpensePieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sem despesas no período
      </div>
    )
  }

  const top5 = [...data].sort((a, b) => b.value - a.value).slice(0, 5)
  const totalDespesas = data.reduce((s, d) => s + d.value, 0)
  const pct = (v: number) => Math.round((v / totalDespesas) * 100)

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="flex-shrink-0" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={top5}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              dataKey="value"
            >
              {top5.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda lateral */}
      <div className="flex-1 flex flex-col gap-2">
        {top5.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-slate-300 truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-slate-500 text-xs">{pct(entry.value)}%</span>
              <span className="text-slate-200 font-medium">{formatCurrency(entry.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
