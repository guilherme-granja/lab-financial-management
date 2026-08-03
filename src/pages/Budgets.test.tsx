import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Budgets from './Budgets'
import { useBudgets } from '@/hooks/useBudgets'
import type { BudgetSummary, MonthlyBudget } from '@/types'

vi.mock('@/hooks/useBudgets', () => ({
  useBudgets: vi.fn(),
}))

vi.mock('@/components/blog/related-posts', () => ({
  RelatedPosts: () => null,
}))

const mockedUseBudgets = vi.mocked(useBudgets)

beforeEach(() => {
  vi.clearAllMocks()
})

function mockHook(overrides: Partial<ReturnType<typeof useBudgets>> = {}) {
  mockedUseBudgets.mockReturnValue({
    budgetConfig: null,
    summary: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    upsertBudgetConfig: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

describe('Budgets — estado vazio', () => {
  it('mostra card de estado vazio quando não há budgetConfig', () => {
    mockHook()
    render(<Budgets />)
    expect(screen.getByText('Nenhum orçamento configurado para este mês')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configurar orçamento deste mês' })).toBeInTheDocument()
  })

  it('não mostra botão "Editar orçamento" sem budgetConfig', () => {
    mockHook()
    render(<Budgets />)
    expect(screen.queryByRole('button', { name: /Editar orçamento/ })).not.toBeInTheDocument()
  })
})

describe('Budgets — diálogo de configuração', () => {
  it('abre o diálogo ao clicar no CTA do estado vazio', async () => {
    mockHook()
    render(<Budgets />)
    await userEvent.click(screen.getByRole('button', { name: 'Configurar orçamento deste mês' }))
    expect(screen.getByText(/Configurar orçamento —/)).toBeInTheDocument()
    expect(screen.getByText('50 / 30 / 20')).toBeInTheDocument()
    expect(screen.getByText('60 / 30 / 10')).toBeInTheDocument()
    expect(screen.getByText('70 / 20 / 10')).toBeInTheDocument()
    expect(screen.getByText('Customizado')).toBeInTheDocument()
  })

  it('valida que a soma customizada precisa ser 100', async () => {
    mockHook()
    render(<Budgets />)
    await userEvent.click(screen.getByRole('button', { name: 'Configurar orçamento deste mês' }))
    await userEvent.click(screen.getByText('Customizado'))

    const needsInput = screen.getByLabelText('Contas (%)')
    fireEvent.change(needsInput, { target: { value: '60' } })

    expect(screen.getByText(/A soma das porcentagens deve ser exatamente 100%/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('permite salvar quando a soma customizada é 100', async () => {
    mockHook()
    render(<Budgets />)
    await userEvent.click(screen.getByRole('button', { name: 'Configurar orçamento deste mês' }))
    await userEvent.click(screen.getByText('Customizado'))
    expect(screen.getByRole('button', { name: 'Salvar' })).not.toBeDisabled()
  })

  it('abre o diálogo pré-populado ao clicar em "Editar orçamento"', async () => {
    const config: MonthlyBudget = {
      id: 'cfg-1',
      month: '2026-06',
      preset: '60_30_10',
      needs_pct: 60,
      leisure_pct: 30,
      savings_pct: 10,
      created_at: '2026-06-01',
    }
    mockHook({ budgetConfig: config })
    render(<Budgets />)
    await userEvent.click(screen.getByRole('button', { name: /Editar orçamento/ }))
    const selectedCard = screen.getByText('60 / 30 / 10').closest('button')
    expect(selectedCard).toHaveClass('border-indigo-500')
  })
})

describe('Budgets — grid de buckets', () => {
  const config: MonthlyBudget = {
    id: 'cfg-1',
    month: '2026-06',
    preset: '50_30_20',
    needs_pct: 50,
    leisure_pct: 30,
    savings_pct: 20,
    created_at: '2026-06-01',
  }

  const summary: BudgetSummary = {
    month: '2026-06',
    base: 1000,
    needs: { amount: 400, pct: 40, targetPct: 50, status: 'verde' },
    leisure: { amount: 300, pct: 30, targetPct: 30, status: 'amarelo' },
    unclassified: { amount: 100, pct: 10, targetPct: null, status: 'neutro' },
    savings: { amount: 200, pct: 20, targetPct: 20, status: 'vermelho' },
    unclassifiedExpenseCount: 1,
    unflaggedIncomeCount: 2,
    unflaggedIncomeAmount: 250,
  }

  it('renderiza os 4 buckets com status calculado', () => {
    mockHook({ budgetConfig: config, summary })
    render(<Budgets />)
    expect(screen.getByText(/Contas/)).toBeInTheDocument()
    expect(screen.getByText(/Lazer/)).toBeInTheDocument()
    expect(screen.getByText(/Guardar/)).toBeInTheDocument()
    expect(screen.getByText(/Não Classificado/)).toBeInTheDocument()

    expect(screen.getByText('No controle')).toBeInTheDocument() // needs: verde
    expect(screen.getByText('Atenção')).toBeInTheDocument() // leisure: amarelo
    expect(screen.getByText('Abaixo da meta')).toBeInTheDocument() // savings: vermelho
    expect(screen.getByText('Fora do cálculo')).toBeInTheDocument() // unclassified: neutro
  })

  it('mostra os dois banners de aviso quando ambos os contadores são positivos', () => {
    mockHook({ budgetConfig: config, summary })
    render(<Budgets />)
    expect(screen.getByText(/1 despesa\(s\) ainda não classificada\(s\)/)).toBeInTheDocument()
    expect(screen.getByText(/2 receita\(s\) ainda não marcada\(s\)/)).toBeInTheDocument()
  })

  it('não mostra banners quando os contadores são zero', () => {
    mockHook({
      budgetConfig: config,
      summary: { ...summary, unclassifiedExpenseCount: 0, unflaggedIncomeCount: 0 },
    })
    render(<Budgets />)
    expect(screen.queryByText(/ainda não classificada/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ainda não marcada/)).not.toBeInTheDocument()
  })

  it('mostra a Base do mês e o preset ativo', () => {
    mockHook({ budgetConfig: config, summary })
    render(<Budgets />)
    expect(screen.getByText(/Base do mês/)).toBeInTheDocument()
    expect(screen.getByText('50 / 30 / 20')).toBeInTheDocument()
  })
})

describe('Budgets — loading e error', () => {
  it('mostra "Carregando..." quando loading=true', () => {
    mockHook({ loading: true })
    render(<Budgets />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra mensagem de erro', () => {
    mockHook({ error: 'falha ao buscar orçamento' })
    render(<Budgets />)
    expect(screen.getByText('falha ao buscar orçamento')).toBeInTheDocument()
  })
})
