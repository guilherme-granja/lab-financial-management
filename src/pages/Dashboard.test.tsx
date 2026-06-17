import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, beforeEach } from 'vitest'
import Dashboard from './Dashboard'
import { mockSupabaseResult } from '@/test/mocks/supabase'

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
})
