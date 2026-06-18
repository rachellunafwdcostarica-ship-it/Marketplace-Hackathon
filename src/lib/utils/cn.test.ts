import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('combina clases simples', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resuelve conflictos de Tailwind', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('filtra valores falsy', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c')
  })
})
