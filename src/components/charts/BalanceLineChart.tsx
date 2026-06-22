import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface BalanceDataPoint {
  month: string
  receitas: number
  despesas: number
}

export function BalanceLineChart({ data }: { data: BalanceDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'receitas' ? 'Receitas' : 'Despesas',
          ]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {value === 'receitas' ? 'Receitas' : 'Despesas'}
            </span>
          )}
        />
        <Line type="monotone" dataKey="receitas" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
        <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
