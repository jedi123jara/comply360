import { describe, expect, it } from 'vitest'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { calcularGratificacion } from '@/lib/legal-engine/calculators/gratificacion'
import {
  REGIMENES,
  REGIMENES_OTROS,
  REGIMENES_PRINCIPALES,
  esRegimenEspecial,
  normalizarRegimen,
  notaRegimen,
} from '../regimen'
import { CALCULADORAS, CALCULADORAS_POR_KEY } from '../catalogo'

describe('regímenes en las calculadoras', () => {
  it('cubre los 12 regímenes del enum de Prisma, sin repetir', () => {
    const todos = [...REGIMENES_PRINCIPALES, ...REGIMENES_OTROS]
    expect(new Set(todos).size).toBe(12)
    expect(Object.keys(REGIMENES).sort()).toEqual([...todos].sort())
  })

  it('agrario, construcción civil y pesquero son referenciales', () => {
    expect(esRegimenEspecial('AGRARIO')).toBe(true)
    expect(esRegimenEspecial('CONSTRUCCION_CIVIL')).toBe(true)
    expect(esRegimenEspecial('PESQUERO')).toBe(true)
    expect(esRegimenEspecial('GENERAL')).toBe(false)
    expect(esRegimenEspecial('MYPE_MICRO')).toBe(false)
  })

  it('un régimen desconocido o vacío se trata como general', () => {
    expect(normalizarRegimen(undefined)).toBe('GENERAL')
    expect(normalizarRegimen('XYZ')).toBe('GENERAL')
  })

  it('explica qué cambia en la microempresa', () => {
    expect(notaRegimen('cts', 'MYPE_MICRO')).toMatch(/no corresponde CTS/)
    expect(notaRegimen('gratificacion', 'MYPE_PEQUENA')).toMatch(/medio sueldo/)
    expect(notaRegimen('vacaciones', 'MYPE_PEQUENA')).toMatch(/15 días/)
  })

  it('los regímenes especiales no llevan nota (llevan el aviso referencial)', () => {
    expect(notaRegimen('cts', 'AGRARIO')).toBeNull()
  })

  it('teletrabajo usa las reglas del régimen general', () => {
    expect(notaRegimen('cts', 'TELETRABAJO')).toMatch(/reglas del régimen general/)
  })

  // Las notas deben decir lo mismo que hace el motor.
  it('la nota de CTS coincide con el motor (micro 0, pequeña 50%)', () => {
    const base = {
      sueldoBruto: 2400,
      fechaIngreso: '2020-01-01',
      fechaCorte: '2026-11-15',
      asignacionFamiliar: false,
      ultimaGratificacion: 2400,
    }
    const general = calcularCTS({ ...base, regimenLaboral: 'GENERAL' }).ctsTotal
    expect(calcularCTS({ ...base, regimenLaboral: 'MYPE_MICRO' }).ctsTotal).toBe(0)
    expect(calcularCTS({ ...base, regimenLaboral: 'MYPE_PEQUENA' }).ctsTotal).toBeCloseTo(general / 2, 2)
  })

  it('la nota de gratificación coincide con el motor (micro 0, pequeña 50%)', () => {
    const base = { sueldoBruto: 2400, fechaIngreso: '2020-01-01', periodo: 'julio' as const, mesesTrabajados: 6, asignacionFamiliar: false }
    expect(calcularGratificacion({ ...base, regimenLaboral: 'MYPE_MICRO' }).gratificacionBruta).toBe(0)
    expect(calcularGratificacion({ ...base, regimenLaboral: 'MYPE_PEQUENA' }).gratificacionBruta).toBe(1200)
  })
})

describe('catálogo de calculadoras', () => {
  it('no repite claves y cada una tiene una línea de para qué sirve', () => {
    expect(new Set(CALCULADORAS.map(c => c.key)).size).toBe(CALCULADORAS.length)
    for (const c of CALCULADORAS) {
      expect(c.paraQueSirve.length).toBeGreaterThan(10)
      expect(c.href.startsWith('/dashboard/')).toBe(true)
      expect(CALCULADORAS_POR_KEY[c.key]).toBe(c)
    }
  })

  it('las rutas usan guion, no guion bajo (las carpetas son kebab-case)', () => {
    for (const c of CALCULADORAS) expect(c.href).not.toContain('_')
  })
})
