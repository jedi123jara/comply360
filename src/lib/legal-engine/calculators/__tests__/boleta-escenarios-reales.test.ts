import { describe, it, expect } from 'vitest'
import { calcularBoleta, type BoletaInput } from '../boleta'

// Smoke / escenarios reales: verifica de punta a punta los números de la boleta
// con los valores vigentes (prima 1.37%, comisión por AFP, tope RMA, jornada
// nocturna, split de renta 5ta). Imprime el desglose para inspección visual.

function resumen(label: string, r: ReturnType<typeof calcularBoleta>) {
  // eslint-disable-next-line no-console
  console.log(
    `\n── ${label} ──\n` +
    `  Total ingresos:   S/ ${r.totalIngresos.toFixed(2)}\n` +
    `  Aporte AFP/ONP:   S/ ${r.aporteAfpOnp.toFixed(2)}\n` +
    `  Prima seguro:     S/ ${r.seguroInvalidez.toFixed(2)}\n` +
    `  Comisión AFP:     S/ ${r.comisionAfp.toFixed(2)}\n` +
    `  Renta 5ta:        S/ ${r.rentaQuintaCat.toFixed(2)}\n` +
    `  Total descuentos: S/ ${r.totalDescuentos.toFixed(2)}\n` +
    `  NETO A PAGAR:     S/ ${r.netoPagar.toFixed(2)}\n` +
    `  Sistema:          ${r.sistemaPrevisional}\n` +
    (r.warnings.length ? `  ⚠️  ${r.warnings.join(' | ')}\n` : '')
  )
}

describe('Boleta — escenarios reales (smoke de dinero)', () => {
  it('1) AFP Prima, S/3000, sueldo normal (debajo de la RMA → sin tope)', () => {
    const r = calcularBoleta({
      sueldoBruto: 3000, asignacionFamiliar: false, tipoAporte: 'AFP', afpNombre: 'PRIMA',
      sctr: false, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
    })
    resumen('AFP Prima · S/3000', r)
    expect(r.aporteAfpOnp).toBeCloseTo(300, 2)        // 10%
    expect(r.seguroInvalidez).toBeCloseTo(41.10, 2)   // 1.37%
    expect(r.comisionAfp).toBeCloseTo(48.00, 2)       // 1.60% Prima
    // La renta proyecta el año INCLUYENDO 2 gratificaciones: 3000×12 + 3000×2 = 42000;
    // (42000 - 38500) × 8% = 280 anual ÷ 9 meses restantes (mes 4) = 31.11/mes.
    expect(r.rentaQuintaCat).toBeCloseTo(31.11, 1)
    expect(r.netoPagar).toBeCloseTo(2579.79, 1)       // 3000 - (300 + 41.10 + 48 + 31.11)
  })

  it('2) AFP Profuturo, S/9000 + asig. familiar (con renta 5ta)', () => {
    const r = calcularBoleta({
      sueldoBruto: 9000, asignacionFamiliar: true, tipoAporte: 'AFP', afpNombre: 'PROFUTURO',
      sctr: true, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
    })
    resumen('AFP Profuturo · S/9000 + asig.fam', r)
    expect(r.comisionAfp).toBeGreaterThan(r.seguroInvalidez) // 1.69% > 1.37%
    expect(r.rentaQuintaCat).toBeGreaterThan(0)
    expect(r.netoPagar).toBeLessThan(r.totalIngresos)
  })

  it('3) AFP Prima, S/20000 — la prima se TOPA en la RMA (no la comisión ni el aporte)', () => {
    const r = calcularBoleta({
      sueldoBruto: 20000, asignacionFamiliar: false, tipoAporte: 'AFP', afpNombre: 'PRIMA',
      sctr: false, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
    })
    resumen('AFP Prima · S/20000 (sueldo alto)', r)
    expect(r.seguroInvalidez).toBeCloseTo(12598.91 * 0.0137, 2) // prima topada en la RMA
    expect(r.aporteAfpOnp).toBeCloseTo(2000, 2)                  // 10% sin tope
    expect(r.comisionAfp).toBeCloseTo(320, 2)                    // 1.60% sin tope
  })

  it('4) ONP, S/3000 — 13%, sin prima ni comisión', () => {
    const r = calcularBoleta({
      sueldoBruto: 3000, asignacionFamiliar: false, tipoAporte: 'ONP',
      sctr: false, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
    })
    resumen('ONP · S/3000', r)
    expect(r.aporteAfpOnp).toBeCloseTo(390, 2) // 13%
    expect(r.seguroInvalidez).toBe(0)
    expect(r.comisionAfp).toBe(0)
  })

  it('5) Jornada nocturna debajo del piso (S/1200) → warning del mínimo RMV+35%', () => {
    const r = calcularBoleta({
      sueldoBruto: 1200, asignacionFamiliar: false, tipoAporte: 'AFP', afpNombre: 'PRIMA',
      sctr: false, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
      jornadaNocturna: true,
    })
    resumen('Nocturno · S/1200 (bajo el piso)', r)
    expect(r.warnings.some(w => w.toLowerCase().includes('jornada nocturna'))).toBe(true)
  })

  it('6) Bonificación habitual vs extraordinaria (S/9000) → la habitual retiene más renta', () => {
    const base: BoletaInput = {
      sueldoBruto: 9000, asignacionFamiliar: false, tipoAporte: 'AFP', afpNombre: 'PRIMA',
      sctr: false, regimenLaboral: 'GENERAL', horasExtras: 0, incluirGratificacion: false, mes: 4,
    }
    const habitual = calcularBoleta({ ...base, bonificacionesHabituales: 1000 })
    const extra = calcularBoleta({ ...base, bonificacionesExtraordinarias: 1000 })
    resumen('Bono HABITUAL S/1000 · S/9000', habitual)
    resumen('Bono EXTRAORDINARIO S/1000 · S/9000', extra)
    expect(habitual.rentaQuintaCat).toBeGreaterThan(extra.rentaQuintaCat)
  })
})
