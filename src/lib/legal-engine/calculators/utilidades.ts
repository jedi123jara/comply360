import { PERU_LABOR } from '../peru-labor'

// =============================================
// UTILIDADES - Participacion en las Utilidades
// D.Leg. 892 y D.S. 009-98-TR
// =============================================

// Participation rates by sector
const TASAS_PARTICIPACION: Record<string, number> = {
  PESCA: 0.10,
  TELECOMUNICACIONES: 0.10,
  INDUSTRIA: 0.10,
  MINERIA: 0.08,
  COMERCIO: 0.08,
  RESTAURANTES: 0.08,
  OTROS: 0.05,
}

// =============================================
// Types
// =============================================

export interface TrabajadorUtilidades {
  nombre: string
  diasTrabajados: number    // dias efectivos en el ano
  remuneracionTotal: number // remuneracion total anual
}

export interface UtilidadesInput {
  rentaAnualNeta: number      // Renta neta imponible
  sector: string
  trabajadores: TrabajadorUtilidades[]
}

export interface DetalleTrabajadorUtilidades {
  nombre: string
  porDias: number
  porRemuneracion: number
  total: number
  tope: number  // max 18 remuneraciones mensuales
  topeAplicado: boolean
  totalFinal: number  // min(total, tope)
}

export interface UtilidadesResult {
  tasaParticipacion: number
  montoTotalParticipacion: number
  distribucionPorDias: number   // 50%
  distribucionPorRemuneracion: number  // 50%
  detallePorTrabajador: DetalleTrabajadorUtilidades[]
  totalDistribuido: number
  remanente: number
  baseLegal: string
  plazoMaximo: string  // 30 dias despues de DJ anual
}

// =============================================
// Calculator
// =============================================

export function calcularUtilidades(input: UtilidadesInput): UtilidadesResult {
  const sectorKey = input.sector.toUpperCase()
  const tasaParticipacion = TASAS_PARTICIPACION[sectorKey] ?? TASAS_PARTICIPACION.OTROS

  // 1. Monto total de participacion
  const montoTotalParticipacion = round(input.rentaAnualNeta * tasaParticipacion)

  // 2. Distribucion: 50% por dias, 50% por remuneracion
  const distribucionPorDias = round(montoTotalParticipacion * 0.5)
  const distribucionPorRemuneracion = round(montoTotalParticipacion * 0.5)

  // 3. Totales para calculo proporcional
  const totalDiasTodos = input.trabajadores.reduce((sum, t) => sum + t.diasTrabajados, 0)
  const totalRemuneracionTodos = input.trabajadores.reduce((sum, t) => sum + t.remuneracionTotal, 0)

  // 4. Calculo por trabajador
  const detallePorTrabajador: DetalleTrabajadorUtilidades[] = input.trabajadores.map(t => {
    // Parte por dias: (dias del trabajador / total dias) * 50%
    const porDias = totalDiasTodos > 0
      ? round((t.diasTrabajados / totalDiasTodos) * distribucionPorDias)
      : 0

    // Parte por remuneracion: (rem del trabajador / total rem) * 50%
    const porRemuneracion = totalRemuneracionTodos > 0
      ? round((t.remuneracionTotal / totalRemuneracionTodos) * distribucionPorRemuneracion)
      : 0

    const total = round(porDias + porRemuneracion)

    // Tope: 18 remuneraciones mensuales del trabajador
    const remuneracionMensual = t.remuneracionTotal / 12
    const tope = round(remuneracionMensual * PERU_LABOR.UTILIDADES.TOPE_REMUNERACIONES)
    const topeAplicado = total > tope
    const totalFinal = topeAplicado ? tope : total

    return {
      nombre: t.nombre,
      porDias,
      porRemuneracion,
      total,
      tope,
      topeAplicado,
      totalFinal,
    }
  })

  // 5. Total distribuido y remanente
  const totalDistribuido = round(
    detallePorTrabajador.reduce((sum, t) => sum + t.totalFinal, 0)
  )
  const remanente = round(montoTotalParticipacion - totalDistribuido)

  return {
    tasaParticipacion,
    montoTotalParticipacion,
    distribucionPorDias,
    distribucionPorRemuneracion,
    detallePorTrabajador,
    totalDistribuido,
    remanente,
    baseLegal: PERU_LABOR.UTILIDADES.BASE_LEGAL,
    plazoMaximo: `${PERU_LABOR.UTILIDADES.PLAZO_PAGO_DIAS} dias calendario despues de la presentacion de la DJ Anual del IR`,
  }
}

// =============================================
// Helpers
// =============================================

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// Format helper
export function fmtUtilidades(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
