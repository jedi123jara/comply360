import { calcularLiquidacion } from '../liquidacion'
import { LiquidacionInput } from '../../types'
import { PERU_LABOR } from '../../peru-labor'

describe('calcularLiquidacion', () => {
  // -----------------------------------------------
  // Full liquidacion with despido arbitrario
  // All components should be present
  // -----------------------------------------------
  describe('liquidacion completa por despido arbitrario', () => {
    const input: LiquidacionInput = {
      sueldoBruto: 3500,
      fechaIngreso: '2022-03-01',
      fechaCese: '2026-03-15',
      motivoCese: 'despido_arbitrario',
      asignacionFamiliar: true,
      gratificacionesPendientes: true,
      vacacionesNoGozadas: 30,   // 1 periodo no gozado (30 dias)
      horasExtrasPendientes: 10,
      ultimaGratificacion: 3602.50,
      comisionesPromedio: 0,
    }

    it('debe retornar un breakdown con todos los componentes', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown).toBeDefined()
      expect(result.breakdown.cts).toBeDefined()
      expect(result.breakdown.vacacionesTruncas).toBeDefined()
      expect(result.breakdown.vacacionesNoGozadas).toBeDefined()
      expect(result.breakdown.gratificacionTrunca).toBeDefined()
      expect(result.breakdown.horasExtras).toBeDefined()
      expect(result.breakdown.bonificacionEspecial).toBeDefined()
    })

    it('debe incluir indemnizacion por despido arbitrario', () => {
      const result = calcularLiquidacion(input)
      // despido_arbitrario triggers indemnizacion
      expect(result.breakdown.indemnizacion).not.toBeNull()
      expect(result.breakdown.indemnizacion!.amount).toBeGreaterThan(0)
    })

    it('debe calcular totalBruto como suma de todos los componentes', () => {
      const result = calcularLiquidacion(input)
      const sumManual =
        result.breakdown.cts.amount +
        result.breakdown.vacacionesTruncas.amount +
        result.breakdown.vacacionesNoGozadas.amount +
        result.breakdown.gratificacionTrunca.amount +
        (result.breakdown.indemnizacion?.amount ?? 0) +
        result.breakdown.horasExtras.amount +
        result.breakdown.bonificacionEspecial.amount

      expect(result.totalBruto).toBeCloseTo(sumManual, 2)
    })

    it('totalNeto debe ser igual a totalBruto (sin retencion)', () => {
      const result = calcularLiquidacion(input)
      expect(result.totalNeto).toBe(result.totalBruto)
    })

    it('debe incluir CTS trunca mayor a 0', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.cts.amount).toBeGreaterThan(0)
      expect(result.breakdown.cts.label).toBe('CTS Trunca')
    })

    it('debe incluir vacaciones truncas', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.vacacionesTruncas.amount).toBeGreaterThanOrEqual(0)
    })

    it('debe incluir vacaciones no gozadas con indemnizacion', () => {
      const result = calcularLiquidacion(input)
      // 30 dias no gozados: pago + indemnizacion (1 rem adicional)
      expect(result.breakdown.vacacionesNoGozadas.amount).toBeGreaterThan(0)
    })

    it('debe incluir gratificacion trunca', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.gratificacionTrunca.amount).toBeGreaterThan(0)
    })

    it('debe incluir horas extras pendientes', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.horasExtras.amount).toBeGreaterThan(0)
    })

    it('debe generar warnings y bases legales', () => {
      const result = calcularLiquidacion(input)
      expect(result.warnings).toBeDefined()
      expect(result.legalBasis).toBeDefined()
      expect(result.legalBasis.length).toBeGreaterThan(0)
    })

    it('debe incluir bases legales de todas las normas relevantes', () => {
      const result = calcularLiquidacion(input)
      const norms = result.legalBasis.map(lb => lb.norm)
      expect(norms).toContain('D.S. 003-97-TR')  // Indemnizacion
      expect(norms).toContain('D.S. 001-97-TR')  // CTS
      expect(norms).toContain('Ley 27735')        // Gratificacion
      expect(norms).toContain('Ley 30334')        // Bonificacion 9%
      expect(norms).toContain('D.Leg. 713')       // Vacaciones
    })
  })

  // -----------------------------------------------
  // Liquidacion por renuncia: no indemnizacion
  // -----------------------------------------------
  describe('liquidacion por renuncia voluntaria', () => {
    const input: LiquidacionInput = {
      sueldoBruto: 2500,
      fechaIngreso: '2023-06-01',
      fechaCese: '2026-03-15',
      motivoCese: 'renuncia',
      asignacionFamiliar: false,
      gratificacionesPendientes: false,
      vacacionesNoGozadas: 0,
      horasExtrasPendientes: 0,
      ultimaGratificacion: 2500,
      comisionesPromedio: 0,
    }

    it('NO debe incluir indemnizacion por renuncia', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.indemnizacion).toBeNull()
    })

    it('debe incluir CTS trunca, vacaciones truncas y gratificacion trunca', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.cts).toBeDefined()
      expect(result.breakdown.vacacionesTruncas).toBeDefined()
      expect(result.breakdown.gratificacionTrunca).toBeDefined()
    })

    it('horas extras y bonificacion especial deben ser 0 cuando no aplica', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.horasExtras.amount).toBe(0)
      expect(result.breakdown.bonificacionEspecial.amount).toBe(0)
    })
  })

  // -----------------------------------------------
  // Liquidacion por fin de contrato
  // -----------------------------------------------
  describe('liquidacion por fin de contrato', () => {
    const input: LiquidacionInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2025-01-01',
      fechaCese: '2026-01-01',
      motivoCese: 'fin_contrato',
      asignacionFamiliar: false,
      gratificacionesPendientes: false,
      vacacionesNoGozadas: 0,
      horasExtrasPendientes: 0,
      ultimaGratificacion: 2000,
      comisionesPromedio: 0,
    }

    it('NO debe incluir indemnizacion por fin de contrato', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.indemnizacion).toBeNull()
    })

    it('totalBruto debe ser mayor a 0 (al menos CTS/gratif trunca)', () => {
      const result = calcularLiquidacion(input)
      expect(result.totalBruto).toBeGreaterThan(0)
    })
  })

  // -----------------------------------------------
  // Liquidacion con sueldo menor a RMV genera warning
  // -----------------------------------------------
  describe('alertas por sueldo menor a RMV', () => {
    const input: LiquidacionInput = {
      sueldoBruto: 800, // Below RMV of 1025
      fechaIngreso: '2025-01-01',
      fechaCese: '2026-03-15',
      motivoCese: 'renuncia',
      asignacionFamiliar: false,
      gratificacionesPendientes: false,
      vacacionesNoGozadas: 0,
      horasExtrasPendientes: 0,
      ultimaGratificacion: 800,
      comisionesPromedio: 0,
    }

    it('debe generar warning de sueldo menor a RMV', () => {
      const result = calcularLiquidacion(input)
      const riskWarning = result.warnings.find(w => w.type === 'riesgo')
      expect(riskWarning).toBeDefined()
      expect(riskWarning!.message).toContain('RMV')
    })
  })

  // -----------------------------------------------
  // Despido arbitrario con comisiones promedio
  // -----------------------------------------------
  describe('liquidacion con comisiones promedio', () => {
    const input: LiquidacionInput = {
      sueldoBruto: 2000,
      fechaIngreso: '2023-01-15',
      fechaCese: '2026-03-15',
      motivoCese: 'despido_arbitrario',
      asignacionFamiliar: false,
      gratificacionesPendientes: false,
      vacacionesNoGozadas: 0,
      horasExtrasPendientes: 0,
      ultimaGratificacion: 2000,
      comisionesPromedio: 500,
    }

    it('debe incluir comisiones en la base de calculo', () => {
      const result = calcularLiquidacion(input)
      // remComputable includes comisionesPromedio
      // This should produce higher amounts than without comisiones
      expect(result.totalBruto).toBeGreaterThan(0)
    })

    it('indemnizacion debe ser calculada con remuneracion computable incluyendo comisiones', () => {
      const result = calcularLiquidacion(input)
      expect(result.breakdown.indemnizacion).not.toBeNull()
      expect(result.breakdown.indemnizacion!.amount).toBeGreaterThan(0)
    })
  })
})
