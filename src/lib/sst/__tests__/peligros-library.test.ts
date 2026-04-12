import { describe, it, expect } from 'vitest'
import {
  PELIGROS_LIBRARY,
  getPeligrosBySector,
  getPeligrosByTipo,
  getPeligroById,
  searchPeligros,
} from '../peligros-library'

describe('PELIGROS_LIBRARY', () => {
  it('should have at least 45 entries', () => {
    expect(PELIGROS_LIBRARY.length).toBeGreaterThanOrEqual(45)
  })

  it('every entry should have required fields', () => {
    for (const p of PELIGROS_LIBRARY) {
      expect(p.id).toBeDefined()
      expect(p.tipo).toBeDefined()
      expect(p.peligro.length).toBeGreaterThan(5)
      expect(p.riesgo.length).toBeGreaterThan(5)
      expect(p.consecuencia.length).toBeGreaterThan(3)
      expect(p.medidasControl.length).toBeGreaterThanOrEqual(1)
      expect(p.sectores.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every entry should have a unique id', () => {
    const ids = PELIGROS_LIBRARY.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should cover all 7 peligro types', () => {
    const types = new Set(PELIGROS_LIBRARY.map(p => p.tipo))
    expect(types).toContain('FISICO')
    expect(types).toContain('MECANICO')
    expect(types).toContain('QUIMICO')
    expect(types).toContain('BIOLOGICO')
    expect(types).toContain('ERGONOMICO')
    expect(types).toContain('PSICOSOCIAL')
    expect(types).toContain('ELECTRICO')
  })

  it('should have entries for TODOS sector (universal peligros)', () => {
    const universal = PELIGROS_LIBRARY.filter(p => p.sectores.includes('TODOS'))
    expect(universal.length).toBeGreaterThanOrEqual(3)
  })
})

describe('getPeligrosBySector', () => {
  it('should return entries for OFICINAS including TODOS', () => {
    const result = getPeligrosBySector('OFICINAS')
    expect(result.length).toBeGreaterThanOrEqual(5)
    // Should include universal entries
    const hasUniversal = result.some(p => p.sectores.includes('TODOS'))
    expect(hasUniversal).toBe(true)
  })

  it('should return more entries for CONSTRUCCION than OFICINAS', () => {
    const construccion = getPeligrosBySector('CONSTRUCCION')
    const oficinas = getPeligrosBySector('OFICINAS')
    expect(construccion.length).toBeGreaterThan(oficinas.length)
  })

  it('should return entries for MINERIA', () => {
    const result = getPeligrosBySector('MINERIA')
    expect(result.length).toBeGreaterThanOrEqual(10)
  })
})

describe('getPeligrosByTipo', () => {
  it('should return only FISICO entries', () => {
    const result = getPeligrosByTipo('FISICO')
    expect(result.length).toBeGreaterThanOrEqual(5)
    for (const p of result) {
      expect(p.tipo).toBe('FISICO')
    }
  })

  it('should return only MECANICO entries', () => {
    const result = getPeligrosByTipo('MECANICO')
    expect(result.length).toBeGreaterThanOrEqual(10)
    for (const p of result) {
      expect(p.tipo).toBe('MECANICO')
    }
  })
})

describe('getPeligroById', () => {
  it('should find F-01', () => {
    const result = getPeligroById('F-01')
    expect(result).toBeDefined()
    expect(result!.tipo).toBe('FISICO')
    expect(result!.peligro).toContain('Ruido')
  })

  it('should find M-01', () => {
    const result = getPeligroById('M-01')
    expect(result).toBeDefined()
    expect(result!.tipo).toBe('MECANICO')
    expect(result!.peligro).toContain('altura')
  })

  it('should return undefined for non-existent id', () => {
    expect(getPeligroById('INVALID')).toBeUndefined()
  })
})

describe('searchPeligros', () => {
  it('should find entries containing "ruido"', () => {
    const result = searchPeligros('ruido')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result[0].peligro.toLowerCase()).toContain('ruido')
  })

  it('should find entries containing "caida"', () => {
    const result = searchPeligros('caida')
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('should return empty for obscure query', () => {
    const result = searchPeligros('xyznonexistent123')
    expect(result.length).toBe(0)
  })

  it('should be case-insensitive', () => {
    const lower = searchPeligros('polvo')
    const upper = searchPeligros('POLVO')
    expect(lower.length).toBe(upper.length)
  })
})
