import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { ASISTENTES_GUIADOS } from '@/components/dashboard/que-quieres-hacer'
import {
  calculatorHref,
  matchesQuery,
  normalizeForSearch,
} from '@/components/ui/command-palette'
import { CALCULATOR_TYPES } from '@/lib/constants'

/** Convierte una ruta del dashboard en el page.tsx que debería existir. */
function pageFileFor(href: string): string {
  return path.resolve(__dirname, '../../../app', `.${href}`, 'page.tsx')
}

describe('ASISTENTES_GUIADOS ("¿Qué quieres hacer?")', () => {
  it('tiene los 5 asistentes, en orden y con llaves únicas', () => {
    expect(ASISTENTES_GUIADOS.map((a) => a.key)).toEqual([
      'contratar',
      'renovar',
      'cesar',
      'auditar',
      'sunafil',
    ])
  })

  it('cada asistente apunta a una página que existe', () => {
    for (const a of ASISTENTES_GUIADOS) {
      expect(a.href).toBe(`/dashboard/decisiones/${a.key}`)
      expect(existsSync(pageFileFor(a.href)), `${a.href} no tiene page.tsx`).toBe(true)
    }
  })

  it('cada asistente tiene título, descripción y palabras de búsqueda', () => {
    for (const a of ASISTENTES_GUIADOS) {
      expect(a.title.length).toBeGreaterThan(3)
      expect(a.description.length).toBeGreaterThan(20)
      expect(a.keywords.length).toBeGreaterThan(0)
    }
  })
})

describe('command palette — rutas de calculadoras', () => {
  it('convierte guion bajo en guion', () => {
    expect(calculatorHref('horas_extras')).toBe('/dashboard/calculadoras/horas-extras')
    expect(calculatorHref('multa_sunafil')).toBe('/dashboard/calculadoras/multa-sunafil')
    expect(calculatorHref('cts')).toBe('/dashboard/calculadoras/cts')
  })

  it('todas las calculadoras del buscador llevan a una página que existe', () => {
    for (const c of CALCULATOR_TYPES) {
      const href = calculatorHref(c.key)
      expect(existsSync(pageFileFor(href)), `${href} no tiene page.tsx`).toBe(true)
    }
  })
})

describe('command palette — filtro sin tildes ni mayúsculas', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizeForSearch('Liquidación')).toBe('liquidacion')
    expect(normalizeForSearch('  INSPECCIÓN  ')).toBe('inspeccion')
  })

  it('encuentra con o sin tildes, en cualquier orden', () => {
    expect(matchesQuery('liquidacion', ['Liquidación de beneficios'])).toBe(true)
    expect(matchesQuery('LIQUIDACIÓN', ['liquidacion'])).toBe(true)
    expect(matchesQuery('contrato renovar', ['Renovar un contrato'])).toBe(true)
    expect(matchesQuery('vacaciones', ['Renovar un contrato'])).toBe(false)
  })

  it('las palabras comunes llevan al asistente correcto', () => {
    const buscar = (q: string) =>
      ASISTENTES_GUIADOS.filter((a) => matchesQuery(q, [a.title, a.description, ...a.keywords])).map(
        (a) => a.key
      )
    expect(buscar('despedir')).toContain('cesar')
    expect(buscar('inspeccion')).toContain('sunafil')
    expect(buscar('boletas')).toContain('auditar')
    expect(buscar('nuevo trabajador')).toContain('contratar')
  })
})
