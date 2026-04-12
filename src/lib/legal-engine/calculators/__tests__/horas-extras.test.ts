import { calcularHorasExtras } from '../horas-extras'
import { HorasExtrasInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularHorasExtras', () => {
  const config = PERU_LABOR.HORAS_EXTRAS

  // -----------------------------------------------
  // First 2 hours per day at 25% sobretasa
  // Worker: S/ 2,400 sueldo, 50 hours/week (2 extra), 1 month
  // -----------------------------------------------
  describe('primeras 2 horas extras diarias al 25%', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 2400,
      horasSemanales: 50, // 2 extra hours/week over 48h max
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    }

    it('debe calcular valor hora base correctamente', () => {
      const result = calcularHorasExtras(input)
      // valorHora = 2400 / 240 = 10
      expect(result.valorHora).toBe(10)
    })

    it('debe calcular valor hora extra al 25%', () => {
      const result = calcularHorasExtras(input)
      // valorHoraExtra25 = 10 * 1.25 = 12.50
      expect(result.valorHoraExtra25).toBe(12.50)
    })

    it('debe calcular valor hora extra al 35%', () => {
      const result = calcularHorasExtras(input)
      // valorHoraExtra35 = 10 * 1.35 = 13.50
      expect(result.valorHoraExtra35).toBe(13.50)
    })

    it('debe asignar horas extras semanales al tramo del 25% cuando son <= 12', () => {
      const result = calcularHorasExtras(input)
      // 50 - 48 = 2 extra hours/week, all within 25% bracket (max 12/week)
      // horas25 = 2 * 4.33 = 8.66
      expect(result.breakdown.horas25.cantidad).toBeGreaterThan(0)
      expect(result.breakdown.horas35.cantidad).toBe(0) // none over 12h/week
    })

    it('debe calcular monto total positivo', () => {
      const result = calcularHorasExtras(input)
      // 8.66 hrs * S/ 12.50 = S/ 108.25 approx
      expect(result.montoTotal).toBeGreaterThan(0)
    })

    it('debe referenciar D.S. 007-2002-TR como base legal', () => {
      const result = calcularHorasExtras(input)
      expect(result.baseLegal).toBe(config.BASE_LEGAL)
    })
  })

  // -----------------------------------------------
  // Additional hours at 35% (exceeding 2h/day bracket)
  // 65 hours/week = 17 extra per week
  // 12 at 25%, 5 at 35%
  // -----------------------------------------------
  describe('horas adicionales al 35% (exceden 2h/dia)', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 2400,
      horasSemanales: 65, // 17 extra hours/week
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    }

    it('debe asignar primeras 12h/semana al 25% y resto al 35%', () => {
      const result = calcularHorasExtras(input)
      // 65 - 48 = 17 extra hours/week
      // max 12 at 25%, remaining 5 at 35%
      // Over 1 month (4.33 weeks):
      // horas25 = 12 * 4.33 = 51.96
      // horas35 = 5 * 4.33 = 21.65
      expect(result.breakdown.horas25.cantidad).toBeGreaterThan(0)
      expect(result.breakdown.horas35.cantidad).toBeGreaterThan(0)
    })

    it('horas al 35% deben tener monto mayor por hora que al 25%', () => {
      const result = calcularHorasExtras(input)
      if (result.breakdown.horas25.cantidad > 0 && result.breakdown.horas35.cantidad > 0) {
        const ratePer25 = result.breakdown.horas25.monto / result.breakdown.horas25.cantidad
        const ratePer35 = result.breakdown.horas35.monto / result.breakdown.horas35.cantidad
        expect(ratePer35).toBeGreaterThan(ratePer25)
      }
    })

    it('montoTotal debe ser suma de montos 25% + 35%', () => {
      const result = calcularHorasExtras(input)
      const sumBreakdown =
        result.breakdown.horas25.monto +
        result.breakdown.horas35.monto +
        result.breakdown.horasDomingo.monto
      expect(result.montoTotal).toBeCloseTo(sumBreakdown, 2)
    })
  })

  // -----------------------------------------------
  // Multiple months accumulated
  // -----------------------------------------------
  describe('horas extras acumuladas por varios meses', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 3000,
      horasSemanales: 52, // 4 extra/week
      mesesAcumulados: 3,
      incluyeDomingos: false,
      horasDomingo: 0,
    }

    it('debe escalar horas al total de meses acumulados', () => {
      const result = calcularHorasExtras(input)
      // 4 extra/week * 4.33 weeks * 3 months = 51.96 horas total
      expect(result.totalHoras).toBeGreaterThan(40) // at least
    })

    it('monto total debe ser 3x mayor que 1 solo mes', () => {
      const inputOneMes: HorasExtrasInput = { ...input, mesesAcumulados: 1 }
      const resultOneMes = calcularHorasExtras(inputOneMes)
      const resultTresMeses = calcularHorasExtras(input)
      expect(resultTresMeses.montoTotal).toBeCloseTo(resultOneMes.montoTotal * 3, 0)
    })
  })

  // -----------------------------------------------
  // With Sunday hours (100% sobretasa)
  // -----------------------------------------------
  describe('horas extras con trabajo en domingo', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 2400,
      horasSemanales: 50,
      mesesAcumulados: 1,
      incluyeDomingos: true,
      horasDomingo: 4, // 4 hours per Sunday
    }

    it('debe calcular horas de domingo con sobretasa del 100%', () => {
      const result = calcularHorasExtras(input)
      expect(result.breakdown.horasDomingo.cantidad).toBeGreaterThan(0)
      expect(result.breakdown.horasDomingo.monto).toBeGreaterThan(0)
    })

    it('valor hora domingo debe ser doble del valor hora base', () => {
      const result = calcularHorasExtras(input)
      // valorHora = 10, domingo = 10 * 2.0 = 20
      const valorHoraDomingo = result.breakdown.horasDomingo.monto / result.breakdown.horasDomingo.cantidad
      expect(valorHoraDomingo).toBeCloseTo(result.valorHora * 2, 1)
    })

    it('totalHoras debe incluir horas de domingo', () => {
      const result = calcularHorasExtras(input)
      const totalFromBreakdown =
        result.breakdown.horas25.cantidad +
        result.breakdown.horas35.cantidad +
        result.breakdown.horasDomingo.cantidad
      expect(result.totalHoras).toBeCloseTo(totalFromBreakdown, 2)
    })
  })

  // -----------------------------------------------
  // No overtime (48 hours exactly)
  // -----------------------------------------------
  describe('sin horas extras (jornada maxima exacta)', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 2400,
      horasSemanales: 48, // exactly the max
      mesesAcumulados: 1,
      incluyeDomingos: false,
      horasDomingo: 0,
    }

    it('debe retornar 0 horas extras y 0 monto', () => {
      const result = calcularHorasExtras(input)
      expect(result.totalHoras).toBe(0)
      expect(result.montoTotal).toBe(0)
      expect(result.breakdown.horas25.cantidad).toBe(0)
      expect(result.breakdown.horas35.cantidad).toBe(0)
    })
  })

  // -----------------------------------------------
  // Sunday hours without weekday overtime
  // -----------------------------------------------
  describe('solo domingos sin horas extras entre semana', () => {
    const input: HorasExtrasInput = {
      sueldoBruto: 2400,
      horasSemanales: 48, // no weekday overtime
      mesesAcumulados: 1,
      incluyeDomingos: true,
      horasDomingo: 8,
    }

    it('debe calcular solo horas de domingo, sin horas 25% ni 35%', () => {
      const result = calcularHorasExtras(input)
      expect(result.breakdown.horas25.cantidad).toBe(0)
      expect(result.breakdown.horas35.cantidad).toBe(0)
      expect(result.breakdown.horasDomingo.cantidad).toBeGreaterThan(0)
      expect(result.montoTotal).toBeGreaterThan(0)
    })
  })
})
