import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, beforeEach } from 'vitest'
import Dashboard from './Dashboard'
import { mockSupabaseResult } from '@/test/mocks/supabase'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'))
vi.mock('@/components/charts/BalanceLineChart', () => ({
  BalanceLineChart: () => null,
}))
vi.mock('@/components/charts/TopCategoriesDonutChart', () => ({
  TopCategoriesDonutChart: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Dashboard', () => {
  it('exibe "Carregando..." no estado inicial', () => {
    mockSupabaseResult({ data: [] })
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe cards de resumo após load', async () => {
    mockSupabaseResult({ data: [
      { id: '1', amount: 3000, type: 'income', date: '2025-06-01', paid: true },
      { id: '2', amount: 1500, type: 'expense', date: '2025-06-02', paid: true },
    ] })
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Receitas do mês')).toBeInTheDocument()
      expect(screen.getByText('Despesas do mês')).toBeInTheDocument()
      expect(screen.getByText('Saldo do mês')).toBeInTheDocument()
      expect(screen.getByText('A pagar este mês')).toBeInTheDocument()
    })
  })

  it('exibe card Despesas do mês após load com dados pagos', async () => {
    // Limitação do mock: buildChain retorna o mesmo data para todas as queries do Dashboard,
    // independente do filtro paid=true. O teste verifica apenas que o label renderiza;
    // o cálculo real de paid=true é coberto nos testes de useTransactions.
    mockSupabaseResult({ data: [
      { id: '1', amount: 1500, type: 'expense', date: '2025-06-01', paid: true },
    ] })
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('Despesas do mês')).toBeInTheDocument()
    })
  })

  it('click no card Despesas navega para /transactions com status=paid', async () => {
    mockSupabaseResult({ data: [] })
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument())
    const card = screen.getByText('Despesas do mês').closest('[class*="cursor-pointer"]') as HTMLElement
    await userEvent.click(card)
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('status=paid'))
  })

  it('click no card Receitas navega para /transactions com status=paid', async () => {
    mockSupabaseResult({ data: [] })
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument())
    const card = screen.getByText('Receitas do mês').closest('[class*="cursor-pointer"]') as HTMLElement
    await userEvent.click(card)
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('status=paid'))
  })
})
