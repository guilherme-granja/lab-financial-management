import { useState } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import type { BudgetPreset, BudgetStatus, BudgetBucketSummary } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PRESETS: Record<Exclude<BudgetPreset, 'custom'>, { needs: number; leisure: number; savings: number; label: string }> = {
  '50_30_20': { needs: 50, leisure: 30, savings: 20, label: '50 / 30 / 20' },
  '60_30_10': { needs: 60, leisure: 30, savings: 10, label: '60 / 30 / 10' },
  '70_20_10': { needs: 70, leisure: 20, savings: 10, label: '70 / 20 / 10' },
}

const PRESET_KEYS: BudgetPreset[] = ['50_30_20', '60_30_10', '70_20_10', 'custom']

const STATUS_COLOR: Record<BudgetStatus, string> = {
  verde: '#22c55e',
  amarelo: '#eab308',
  vermelho: '#ef4444',
  neutro: '#475569',
}

type BucketKey = 'needs' | 'leisure' | 'savings' | 'unclassified'

const BUCKET_META: { key: BucketKey; label: string; icon: string }[] = [
  { key: 'needs', label: 'Contas', icon: '🏠' },
  { key: 'leisure', label: 'Lazer', icon: '🎉' },
  { key: 'savings', label: 'Guardar', icon: '💰' },
  { key: 'unclassified', label: 'Não Classificado', icon: '❓' },
]

function statusLabel(bucketKey: BucketKey, status: BudgetStatus): string {
  if (bucketKey === 'unclassified') return 'Fora do cálculo'
  if (status === 'verde') return 'No controle'
  if (status === 'amarelo') return 'Atenção'
  if (status === 'vermelho') return bucketKey === 'savings' ? 'Abaixo da meta' : 'Estourou'
  return 'Fora do cálculo'
}

export default function Budgets() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  function navigatePeriod(delta: number) {
    setSelectedMonth(format(addMonths(parseISO(`${selectedMonth}-01`), delta), 'yyyy-MM'))
  }

  const { budgetConfig, summary, loading, error, upsertBudgetConfig } = useBudgets(selectedMonth)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formPreset, setFormPreset] = useState<BudgetPreset>('50_30_20')
  const [formNeeds, setFormNeeds] = useState(String(PRESETS['50_30_20'].needs))
  const [formLeisure, setFormLeisure] = useState(String(PRESETS['50_30_20'].leisure))
  const [formSavings, setFormSavings] = useState(String(PRESETS['50_30_20'].savings))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openConfigDialog() {
    if (budgetConfig) {
      setFormPreset(budgetConfig.preset ?? 'custom')
      setFormNeeds(String(budgetConfig.needs_pct))
      setFormLeisure(String(budgetConfig.leisure_pct))
      setFormSavings(String(budgetConfig.savings_pct))
    } else {
      setFormPreset('50_30_20')
      setFormNeeds(String(PRESETS['50_30_20'].needs))
      setFormLeisure(String(PRESETS['50_30_20'].leisure))
      setFormSavings(String(PRESETS['50_30_20'].savings))
    }
    setFormError(null)
    setDialogOpen(true)
  }

  function selectPreset(preset: BudgetPreset) {
    setFormPreset(preset)
    if (preset !== 'custom') {
      const p = PRESETS[preset]
      setFormNeeds(String(p.needs))
      setFormLeisure(String(p.leisure))
      setFormSavings(String(p.savings))
    }
  }

  const sum = (parseFloat(formNeeds) || 0) + (parseFloat(formLeisure) || 0) + (parseFloat(formSavings) || 0)
  const sumValid = Math.abs(sum - 100) < 0.01

  async function handleSaveConfig() {
    if (!sumValid) return
    setSaving(true)
    setFormError(null)
    try {
      await upsertBudgetConfig(selectedMonth, {
        preset: formPreset,
        needs_pct: parseFloat(formNeeds) || 0,
        leisure_pct: parseFloat(formLeisure) || 0,
        savings_pct: parseFloat(formSavings) || 0,
      })
      setDialogOpen(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao salvar orçamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-200 font-semibold text-lg">Orçamentos</h2>
        <div className="flex items-center gap-2">
          {budgetConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={openConfigDialog}
              className="bg-transparent border-[#2d3148] text-slate-300 hover:bg-[#2d3148] gap-1.5"
            >
              <Pencil size={14} />
              Editar orçamento
            </Button>
          )}
          <div className="flex items-center gap-0.5 bg-[#1a1d27] border border-[#2d3148] rounded-lg h-9 px-1 w-fit">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
              onClick={() => navigatePeriod(-1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-slate-200 text-sm w-32 text-center capitalize select-none">
              {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
              onClick={() => navigatePeriod(1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && !budgetConfig && (
        <Card className="border-dashed border-[#2d3148] bg-[#1a1d27]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <span className="text-4xl">🎯</span>
            <p className="text-slate-300 text-sm font-medium">Nenhum orçamento configurado para este mês</p>
            <p className="text-slate-500 text-xs max-w-sm">
              Defina como sua renda deve ser dividida entre Contas, Lazer e Guardar para acompanhar seus gastos.
            </p>
            <Button onClick={openConfigDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
              Configurar orçamento deste mês
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && budgetConfig && summary && (
        <div className="space-y-3">
          {summary.unclassifiedExpenseCount > 0 && (
            <div className="flex gap-2 items-start bg-[#451a0322] border border-[#78350f] rounded-lg p-3 text-sm text-amber-300">
              ⚠️ {summary.unclassifiedExpenseCount} despesa(s) ainda não classificada(s) neste mês (
              {formatCurrency(summary.unclassified.amount)}) — elas não entram no cálculo abaixo.
            </div>
          )}
          {summary.unflaggedIncomeCount > 0 && (
            <div className="flex gap-2 items-start bg-[#451a0322] border border-[#78350f] rounded-lg p-3 text-sm text-amber-300">
              ⚠️ {summary.unflaggedIncomeCount} receita(s) ainda não marcada(s) pra contabilizar neste mês (
              {formatCurrency(summary.unflaggedIncomeAmount)}) — ela(s) não entram na Base do cálculo abaixo.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BUCKET_META.map(({ key, label, icon }) => {
              const bucket: BudgetBucketSummary = summary[key]
              const color = STATUS_COLOR[bucket.status]
              const barWidth = bucket.targetPct ? Math.min(100, (bucket.pct / bucket.targetPct) * 100) : 0
              const isUnclassified = key === 'unclassified'
              return (
                <Card
                  key={key}
                  className={`bg-[#1a1d27] border-[#2d3148] ${isUnclassified ? 'border-dashed' : ''}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-200 text-sm font-medium">
                        {icon} {label}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full border shrink-0"
                        style={{ color, borderColor: color, backgroundColor: `${color}22` }}
                      >
                        {statusLabel(key, bucket.status)}
                      </span>
                    </div>
                    <p className="text-slate-100 text-xl font-semibold">{formatCurrency(bucket.amount)}</p>
                    <p className="text-slate-500 text-xs">
                      Meta: {bucket.targetPct !== null ? `${bucket.targetPct}%` : 'sem meta'} · Real:{' '}
                      {bucket.pct.toFixed(1)}%
                    </p>
                    <div className="h-2 rounded-full bg-[#0f1117] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, backgroundColor: color }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex items-center justify-between text-sm text-slate-400 px-1">
            <span>
              Base do mês: <span className="text-slate-200 font-medium">{formatCurrency(summary.base)}</span>
            </span>
            <span>
              Preset:{' '}
              <span className="text-slate-200 font-medium">
                {budgetConfig.preset && budgetConfig.preset !== 'custom'
                  ? PRESETS[budgetConfig.preset].label
                  : 'Customizado'}
              </span>
            </span>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>
              Configurar orçamento — {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRESET_KEYS.map((key) => {
                const isSelected = formPreset === key
                const info = key === 'custom' ? null : PRESETS[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectPreset(key)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'border-[#2d3148] text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-transparent'
                    }`}
                  >
                    <p className="text-sm font-medium">{info ? info.label : 'Customizado'}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {info
                        ? `${info.needs}% Contas · ${info.leisure}% Lazer · ${info.savings}% Guardar`
                        : 'Definir manualmente'}
                    </p>
                  </button>
                )
              })}
            </div>

            {formPreset === 'custom' && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="needs_pct" className="text-slate-400 text-xs">Contas (%)</Label>
                  <Input
                    id="needs_pct"
                    type="number"
                    value={formNeeds}
                    onChange={(e) => setFormNeeds(e.target.value)}
                    className="bg-[#0f1117] border-[#2d3148]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="leisure_pct" className="text-slate-400 text-xs">Lazer (%)</Label>
                  <Input
                    id="leisure_pct"
                    type="number"
                    value={formLeisure}
                    onChange={(e) => setFormLeisure(e.target.value)}
                    className="bg-[#0f1117] border-[#2d3148]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="savings_pct" className="text-slate-400 text-xs">Guardar (%)</Label>
                  <Input
                    id="savings_pct"
                    type="number"
                    value={formSavings}
                    onChange={(e) => setFormSavings(e.target.value)}
                    className="bg-[#0f1117] border-[#2d3148]"
                  />
                </div>
              </div>
            )}

            {!sumValid && (
              <p className="text-red-400 text-sm">
                A soma das porcentagens deve ser exatamente 100% (atual: {sum.toFixed(1)}%)
              </p>
            )}
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saving || !sumValid}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
