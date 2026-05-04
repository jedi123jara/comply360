import { describe, it, expect } from 'vitest'
import {
  calcularComposicionMinima,
  analizarComite,
  calcularFinMandato,
  diasRestantesMandato,
  type MiembroLite,
} from '../comite-rules'

describe('calcularComposicionMinima', () => {
  it('< 20 trabajadores → SUPERVISOR (1 miembro)', () => {
    const r = calcularComposicionMinima(15)
    expect(r.tipo).toBe('SUPERVISOR')
    expect(r.totalMiembros).toBe(1)
    expect(r.representantesEmpleador).toBe(0)
    expect(r.representantesTrabajadores).toBe(1)
  })

  it('= 19 trabajadores → SUPERVISOR (borde inferior)', () => {
    const r = calcularComposicionMinima(19)
    expect(r.tipo).toBe('SUPERVISOR')
  })

  it('= 20 trabajadores → COMITE 4 (borde inferior)', () => {
    const r = calcularComposicionMinima(20)
    expect(r.tipo).toBe('COMITE')
    expect(r.totalMiembros).toBe(4)
    expect(r.representantesEmpleador).toBe(2)
    expect(r.representantesTrabajadores).toBe(2)
  })

  it('= 49 → COMITE 4', () => {
    expect(calcularComposicionMinima(49).totalMiembros).toBe(4)
  })

  it('= 50 → COMITE 6', () => {
    const r = calcularComposicionMinima(50)
    expect(r.totalMiembros).toBe(6)
    expect(r.representantesEmpleador).toBe(3)
    expect(r.representantesTrabajadores).toBe(3)
  })

  it('= 99 → COMITE 6', () => {
    expect(calcularComposicionMinima(99).totalMiembros).toBe(6)
  })

  it('= 100 → COMITE 8', () => {
    const r = calcularComposicionMinima(100)
    expect(r.totalMiembros).toBe(8)
    expect(r.representantesEmpleador).toBe(4)
  })

  it('= 499 → COMITE 8', () => {
    expect(calcularComposicionMinima(499).totalMiembros).toBe(8)
  })

  it('= 500 → COMITE 10', () => {
    const r = calcularComposicionMinima(500)
    expect(r.totalMiembros).toBe(10)
    expect(r.representantesEmpleador).toBe(5)
  })

  it('= 1000 → COMITE 12', () => {
    const r = calcularComposicionMinima(1000)
    expect(r.totalMiembros).toBe(12)
    expect(r.representantesEmpleador).toBe(6)
  })

  it('= 5000 → COMITE 12 (cap superior)', () => {
    expect(calcularComposicionMinima(5000).totalMiembros).toBe(12)
  })

  it('siempre devuelve número par para COMITE', () => {
    for (const n of [20, 50, 100, 500, 1000]) {
      const r = calcularComposicionMinima(n)
      expect(r.totalMiembros % 2).toBe(0)
      expect(r.representantesEmpleador).toBe(r.representantesTrabajadores)
    }
  })
})

describe('analizarComite', () => {
  const M = (
    cargo: 'PRESIDENTE' | 'SECRETARIO' | 'MIEMBRO',
    origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES',
    fechaBaja: Date | null = null,
  ): MiembroLite => ({ cargo, origen, fechaBaja })

  it('Comité completo y paritario cumple', () => {
    const r = analizarComite(50, [
      M('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.cumple).toBe(true)
    expect(r.observaciones).toEqual([])
    expect(r.brecha.total).toBe(0)
  })

  it('Comité incompleto reporta brecha', () => {
    const r = analizarComite(50, [
      M('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      M('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.cumple).toBe(false)
    expect(r.brecha.representantesEmpleador).toBe(2)
    expect(r.brecha.representantesTrabajadores).toBe(2)
    expect(r.observaciones.length).toBeGreaterThan(0)
  })

  it('Comité no paritario reporta observación', () => {
    const r = analizarComite(20, [
      M('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.cumple).toBe(false)
    expect(r.observaciones.some((o) => /no paritaria/i.test(o))).toBe(true)
  })

  it('Comité sin presidente reporta faltaCargo', () => {
    const r = analizarComite(20, [
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.faltaCargo).toBe('PRESIDENTE')
    expect(r.cumple).toBe(false)
  })

  it('Comité sin secretario reporta faltaCargo', () => {
    const r = analizarComite(20, [
      M('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
    ])
    expect(r.faltaCargo).toBe('SECRETARIO')
    expect(r.cumple).toBe(false)
  })

  it('miembros con fechaBaja no cuentan', () => {
    const r = analizarComite(20, [
      M('PRESIDENTE', 'REPRESENTANTE_EMPLEADOR'),
      M('MIEMBRO', 'REPRESENTANTE_EMPLEADOR'),
      M('SECRETARIO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES'),
      M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES', new Date('2025-01-01')),
    ])
    expect(r.actual.total).toBe(4)
    expect(r.actual.representantesTrabajadores).toBe(2)
  })

  it('Supervisor cumple con 1 miembro', () => {
    const r = analizarComite(10, [M('MIEMBRO', 'REPRESENTANTE_TRABAJADORES')])
    expect(r.minimo.tipo).toBe('SUPERVISOR')
    expect(r.cumple).toBe(true)
  })

  it('Supervisor sin miembros no cumple', () => {
    const r = analizarComite(10, [])
    expect(r.cumple).toBe(false)
  })
})

describe('calcularFinMandato + diasRestantesMandato', () => {
  it('agrega exactamente 2 años', () => {
    const inicio = new Date('2026-05-01T12:00:00.000Z')
    const fin = calcularFinMandato(inicio)
    expect(fin.getUTCFullYear()).toBe(2028)
    expect(fin.getUTCMonth()).toBe(4) // mayo (0-indexed)
    expect(fin.getUTCDate()).toBe(1)
  })

  it('días restantes positivos cuando fin > now', () => {
    const fin = new Date('2027-01-01T00:00:00.000Z')
    const now = new Date('2026-05-01T00:00:00.000Z')
    expect(diasRestantesMandato(fin, now)).toBeGreaterThan(0)
  })

  it('días restantes negativos cuando vencido', () => {
    const fin = new Date('2026-01-01T00:00:00.000Z')
    const now = new Date('2026-05-01T00:00:00.000Z')
    expect(diasRestantesMandato(fin, now)).toBeLessThan(0)
  })
})
