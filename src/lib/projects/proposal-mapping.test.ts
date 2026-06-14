import { describe, it, expect } from 'vitest'
import { resolveCatalog } from './proposal-mapping'

const catalog = [
  { id: '1', nombre: 'React' },
  { id: '2', nombre: 'Node.js' },
  { id: '3', nombre: 'PostgreSQL' },
]

describe('resolveCatalog', () => {
  it('resuelve nombres contra el catálogo (case-insensitive)', () => {
    const refs = resolveCatalog(['react', 'POSTGRESQL'], catalog)
    expect(refs.map((ref) => ref.id)).toEqual(['1', '3'])
    expect(refs[0]?.nombre).toBe('React')
  })

  it('descarta nombres que no existen en el catálogo', () => {
    const refs = resolveCatalog(['React', 'Inventado'], catalog)
    expect(refs).toHaveLength(1)
    expect(refs[0]?.id).toBe('1')
  })

  it('deduplica por id', () => {
    const refs = resolveCatalog(['React', 'react ', ' REACT'], catalog)
    expect(refs).toHaveLength(1)
  })

  it('devuelve vacío si nada matchea', () => {
    expect(resolveCatalog(['x', 'y'], catalog)).toEqual([])
  })
})
