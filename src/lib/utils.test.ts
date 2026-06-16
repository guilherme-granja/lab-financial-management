import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('combina classes simples', () => {
    expect(cn('a', 'b')).toBe('a b')
  })
  it('resolve conflito de Tailwind (última vence)', () => {
    expect(cn('text-red-500', 'text-green-500')).toBe('text-green-500')
  })
  it('ignora valores falsy', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})
