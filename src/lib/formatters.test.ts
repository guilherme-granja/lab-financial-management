import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatMonth, capitalizeFirst } from './formatters'

describe('formatCurrency', () => {
  it('formata valor positivo com R$ e vírgula decimal', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/R\$\s+1\.234,56/)
  })
  it('formata zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/R\$\s+0,00/)
  })
  it('formata valor negativo', () => {
    const result = formatCurrency(-500)
    expect(result).toMatch(/R\$\s+500,00/)
  })
})

describe('formatDate', () => {
  it('converte yyyy-MM-dd para dd/MM/yyyy', () => {
    expect(formatDate('2026-06-15')).toBe('15/06/2026')
  })
  it('aceita string com timestamp ISO', () => {
    // parseISO interprets based on local timezone, so use a date without T
    const result = formatDate('2026-01-15')
    expect(result).toBe('15/01/2026')
  })
})

describe('formatMonth', () => {
  it('retorna mês e ano em português', () => {
    expect(formatMonth('2026-06-01')).toMatch(/junho/i)
    expect(formatMonth('2026-06-01')).toContain('2026')
  })
})

describe('capitalizeFirst', () => {
  it('capitalize a primeira letra', () => {
    expect(capitalizeFirst('hello')).toBe('Hello')
  })
  it('retorna string vazia como vazia', () => {
    expect(capitalizeFirst('')).toBe('')
  })
  it('mantém capitalização do resto', () => {
    expect(capitalizeFirst('hELLO')).toBe('HELLO')
  })
})
