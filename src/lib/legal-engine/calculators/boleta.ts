/**
 * CALCULADORA DE BOLETA DE PAGO MENSUAL
 *
 * Combina:
 *  - Ingresos: sueldo bruto + asignación familiar + horas extras + bonificaciones
 *  - Descuentos trabajador: AFP/ONP + seguro invalidez + comisión AFP + renta 5ta
 *  - Aportes empleador (informativos): EsSalud 9% + SCTR
 *  - Neto a pagar
 *
 * Regímenes especiales:
 *  - MYPE_MICRO: sin gratificaciones
 *  - MYPE_PEQUENA: 50% gratificaciones
 *  - AGRARIO: remuneración diaria incluye CTS y gratificación prorrateadas
 */

import { PERU_LABOR, calcularRemuneracionComputable } from '../peru-labor'
import { calcularAportesPrevisionales, type AportesInput } from './aportes-previsionales'
import { calcularRentaQuinta, type RentaQuintaInput } from './renta-quinta'
import { money } from '../money'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BoletaInput {
  // Datos del trabajador
  sueldoBruto: number
  asignacionFamiliar: boolean
  tipoAporte: 'AFP' | 'ONP' | 'SIN_APORTE'
  afpNombre?: string
  sctr?: boolean
  regimenLaboral?: string

  // Ingresos variables del período
  horasExtras?: number          // monto en soles
  bonificaciones?: number       // bonificaciones del período
  incluirGratificacion?: boolean // si este mes hay gratificación (jul/dic)

  // Renta 5ta categoría
  mes: number                   // 1-12 (para cálculo incremental de renta)
  retencionRentaAcumulada?: number // monto ya retenido en meses anteriores

  // Horas extras pendientes (para mostrar en detalle)
  horasExtrasPendientes?: number // cantidad de horas (para detalleJson)

  // Descuento por tardanzas/ausencias no justificadas (Fase 4 — Asistencia × Nómina).
  // Se calcula en /api/workers/[id]/payslips antes de invocar calcularBoleta
  // usando calculateLateDeduction() de src/lib/attendance/late-deduction.ts
  descuentoTardanzasMonto?: number
  descuentoTardanzasMinutos?: number // informativo para detalleJson
}

export interface BoletaLineaIngreso {
  concepto: string
  monto: number
  esVariable?: boolean
}

export interface BoletaLineaDescuento {
  concepto: string
  monto: number
  porcentaje?: string
}

export interface BoletaResult {
  // Resumen
  totalIngresos: number
  totalDescuentos: number
  netoPagar: number

  // Ingresos breakdown
  ingresos: BoletaLineaIngreso[]
  sueldoBruto: number
  asignacionFamiliar: number
  horasExtras: number
  bonificaciones: number
  gratificacion: number
  bonificacionExtraordinaria: number  // 9% sobre gratificación

  // Descuentos trabajador breakdown
  descuentos: BoletaLineaDescuento[]
  aporteAfpOnp: number
  seguroInvalidez: number
  comisionAfp: number
  rentaQuintaCat: number
  descuentoTardanzas: number  // Tardanzas/ausencias no justificadas (Fase 4)

  // Aportes empleador (informativos)
  essalud: number
  sctr: number
  costoTotalEmpleador: number
  ctsEstimadoMes: number    // estimado de CTS que se va devengando

  // Sistema previsional
  sistemaPrevisional: string
  afpNombre?: string

  // Detalles renta 5ta
  detalleRentaQuinta: {
    rentaBrutaAnualProyectada: number
    deduccion7UIT: number
    rentaNetaAnualImponible: number
    impuestoAnualProyectado: number
  }

  // Detalles JSON completo (para guardar en DB)
  detalleJson: Record<string, number | string | null>

  baseLegal: string[]
}

// ── Calculator ───────────────────────────────────────────────────────────────

export function calcularBoleta(input: BoletaInput): BoletaResult {
  const {
    sueldoBruto,
    asignacionFamiliar,
    tipoAporte,
    afpNombre,
    sctr = false,
    regimenLaboral = 'GENERAL',
    horasExtras = 0,
    bonificaciones = 0,
    incluirGratificacion = false,
    mes,
    retencionRentaAcumulada = 0,
    descuentoTardanzasMonto = 0,
  } = input

  const rmv = PERU_LABOR.RMV

  // ── 1. Asignación familiar ──────────────────────────────────────────────────
  const montoAsigFamiliar = asignacionFamiliar
    ? round(rmv * PERU_LABOR.ASIGNACION_FAMILIAR_PORCENTAJE)
    : 0

  // ── 2. Gratificación del mes (si aplica) ────────────────────────────────────
  //   Solo en julio y diciembre. MYPE_MICRO: sin gratificación.
  //   MYPE_PEQUENA: 50% de la gratificación normal.
  let gratificacion = 0
  let bonificacionExtraordinaria = 0

  if (incluirGratificacion && regimenLaboral !== 'MYPE_MICRO') {
    const remComputable = calcularRemuneracionComputable(sueldoBruto, asignacionFamiliar)
    const factorGratif =
      regimenLaboral === 'MYPE_PEQUENA'
        ? PERU_LABOR.MYPE.PEQUENA.GRATIFICACIONES_PORCENTAJE
        : 1.0
    gratificacion = round(remComputable * factorGratif)
    bonificacionExtraordinaria = round(
      gratificacion * PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA
    )
  }

  // ── 3. Total ingresos ───────────────────────────────────────────────────────
  const totalIngresos = round(
    sueldoBruto
    + montoAsigFamiliar
    + horasExtras
    + bonificaciones
    + gratificacion
    + bonificacionExtraordinaria
  )

  // ── 4. Aportes previsionales (AFP/ONP) ──────────────────────────────────────
  const aportesInput: AportesInput = {
    sueldoBruto,
    asignacionFamiliar,
    tipoAporte,
    afpNombre,
    sctr,
    horasExtras,
  }
  const aportes = calcularAportesPrevisionales(aportesInput)

  // ── 5. Renta 5ta categoría ──────────────────────────────────────────────────
  //   La base para proyectar renta no incluye los montos no habituales (bonificaciones
  //   extraordinarias se tratan por separado — aquí usamos rem computable habitual)
  const remHabitual = aportes.remuneracionComputable

  // FIX #2.E.4: Gratificaciones anuales se calculan sobre `remHabitual`
  // (sueldo + asig fam + comisiones promedio), NO sobre `sueldoBruto` solo.
  // Antes la base subdeclaraba la grati cuando había asignación familiar
  // (S/113) y la proyección de renta 5ta quedaba ~S/26/mes baja.
  // FIX #2.D: CAS post-2026 tiene gratificaciones (Ley 2026 — TIENE_GRATIFICACION:true).
  // El default `× 2` ya lo cubre; AGRARIO incluye grati en jornal (no separar).
  const isAgrario = regimenLaboral === 'AGRARIO'
  const gratifAnual =
    regimenLaboral === 'MYPE_MICRO' || regimenLaboral === 'MODALIDAD_FORMATIVA'
      ? 0
      : regimenLaboral === 'MYPE_PEQUENA'
        ? remHabitual * PERU_LABOR.MYPE.PEQUENA.GRATIFICACIONES_PORCENTAJE * 2
        : isAgrario
          ? 0 // ya prorrateada en remuneración diaria (16.66%)
          : remHabitual * 2 // GENERAL, CAS_2026, AGRARIO general → 2 gratif anuales

  // FIX #2.E.3: `bonificaciones` puede contener la bonif. extraordinaria 9%
  // sobre grati (Ley 30334) que está EXONERADA de renta 5ta. Si el caller
  // ya pasó `bonificacionesNoGravables`, lo restamos antes de proyectar.
  // Esta calculadora no tiene visibilidad sobre la composición; documentamos
  // que el caller debe pasar SOLO bonificaciones gravables (no la 9% Ley 30334).
  const otrosIngresosGravables = bonificaciones

  const rentaInput: RentaQuintaInput = {
    remuneracionMensual: remHabitual,
    mes,
    gratificacionesAnuales: gratifAnual,
    retenidoAcumulado: retencionRentaAcumulada,
    otrosIngresosAnuales: otrosIngresosGravables,
  }
  const rentaResult = calcularRentaQuinta(rentaInput)
  const rentaQuintaCat = rentaResult.retencionMesActual

  // ── 6. Total descuentos ─────────────────────────────────────────────────────
  // Incluye descuento por tardanzas/ausencias no justificadas (Fase 4 — el monto
  // se calcula afuera con calculateLateDeduction y se pasa via input).
  const descuentoTardanzas = Math.max(0, round(descuentoTardanzasMonto))
  const totalDescuentos = round(
    aportes.totalDescuentoTrabajador + rentaQuintaCat + descuentoTardanzas
  )

  // ── 7. Neto a pagar ─────────────────────────────────────────────────────────
  const netoPagar = round(totalIngresos - totalDescuentos)

  // ── 8. Costo total empleador ────────────────────────────────────────────────
  const costoTotalEmpleador = round(totalIngresos + aportes.totalAporteEmpleador)

  // ── 9. CTS devengado estimado (informativo) ─────────────────────────────────
  //   CTS mensual = (rem computable + 1/6 gratif) / 12
  const ctsBaseComputable = calcularRemuneracionComputable(sueldoBruto, asignacionFamiliar)
  const ctsEstimadoMes = round((ctsBaseComputable + sueldoBruto / 6) / 12)

  // ── Ingresos breakdown ──────────────────────────────────────────────────────
  const ingresos: BoletaLineaIngreso[] = [
    { concepto: 'Sueldo Básico', monto: sueldoBruto },
  ]
  if (montoAsigFamiliar > 0) {
    ingresos.push({ concepto: 'Asignación Familiar (10% RMV)', monto: montoAsigFamiliar })
  }
  if (horasExtras > 0) {
    ingresos.push({ concepto: 'Horas Extras', monto: horasExtras, esVariable: true })
  }
  if (bonificaciones > 0) {
    ingresos.push({ concepto: 'Bonificaciones', monto: bonificaciones, esVariable: true })
  }
  if (gratificacion > 0) {
    ingresos.push({
      concepto: `Gratificación ${mes === 7 ? 'Julio' : 'Diciembre'}`,
      monto: gratificacion,
      esVariable: true,
    })
  }
  if (bonificacionExtraordinaria > 0) {
    ingresos.push({
      concepto: 'Bonificación Extraordinaria 9% (EsSalud)',
      monto: bonificacionExtraordinaria,
      esVariable: true,
    })
  }

  // ── Descuentos breakdown ────────────────────────────────────────────────────
  const descuentos: BoletaLineaDescuento[] = []
  if (tipoAporte === 'AFP') {
    descuentos.push({
      concepto: `AFP ${afpNombre ?? 'AFP'} — Aporte Obligatorio`,
      monto: aportes.aporteObligatorio,
      porcentaje: '10%',
    })
    if (aportes.seguroInvalidez > 0) {
      descuentos.push({
        concepto: 'AFP — Seguro de Invalidez y Sobrevivencia',
        monto: aportes.seguroInvalidez,
        porcentaje: '1.84%',
      })
    }
    if (aportes.comisionAfp > 0) {
      descuentos.push({
        concepto: `AFP — Comisión sobre flujo`,
        monto: aportes.comisionAfp,
        porcentaje: `~${(aportes.comisionAfp / aportes.remuneracionComputable * 100).toFixed(2)}%`,
      })
    }
  } else if (tipoAporte === 'ONP') {
    descuentos.push({
      concepto: 'ONP — Sistema Nacional de Pensiones',
      monto: aportes.aporteObligatorio,
      porcentaje: '13%',
    })
  }
  if (rentaQuintaCat > 0) {
    descuentos.push({
      concepto: 'Renta de 5ta Categoría (Retención)',
      monto: rentaQuintaCat,
      porcentaje: 'Escala progresiva',
    })
  }
  if (descuentoTardanzas > 0) {
    const minutosInfo = input.descuentoTardanzasMinutos
    descuentos.push({
      concepto: minutosInfo
        ? `Tardanzas/ausencias no justificadas (${minutosInfo} min)`
        : 'Tardanzas/ausencias no justificadas',
      monto: descuentoTardanzas,
      porcentaje: 'Proporcional a jornada',
    })
  }

  // ── detalleJson para guardar en DB ──────────────────────────────────────────
  const detalleJson: Record<string, number | string | null> = {
    sueldoBruto,
    asignacionFamiliar: montoAsigFamiliar,
    horasExtras,
    bonificaciones,
    gratificacion,
    bonificacionExtraordinaria,
    totalIngresos,
    aporteAfpOnp: aportes.aporteObligatorio,
    seguroInvalidez: aportes.seguroInvalidez,
    comisionAfp: aportes.comisionAfp,
    rentaQuintaCat,
    descuentoTardanzas,
    descuentoTardanzasMinutos: input.descuentoTardanzasMinutos ?? 0,
    totalDescuentos,
    netoPagar,
    essalud: aportes.essalud,
    sctrMonto: aportes.sctr,
    ctsEstimadoMes,
    sistemaPrevisional: aportes.sistema,
    rentaBrutaAnualProyectada: rentaResult.rentaBrutaAnualProyectada,
    deduccion7UIT: rentaResult.deduccion7UIT,
    rentaNetaAnualImponible: rentaResult.rentaNetaAnualImponible,
    impuestoAnualProyectado: rentaResult.impuestoAnualProyectado,
  }

  return {
    totalIngresos,
    totalDescuentos,
    netoPagar,
    ingresos,
    sueldoBruto,
    asignacionFamiliar: montoAsigFamiliar,
    horasExtras,
    bonificaciones,
    gratificacion,
    bonificacionExtraordinaria,
    descuentos,
    aporteAfpOnp: aportes.aporteObligatorio,
    seguroInvalidez: aportes.seguroInvalidez,
    comisionAfp: aportes.comisionAfp,
    rentaQuintaCat,
    descuentoTardanzas,
    essalud: aportes.essalud,
    sctr: aportes.sctr,
    costoTotalEmpleador,
    ctsEstimadoMes,
    sistemaPrevisional: aportes.sistema,
    afpNombre: aportes.afp,
    detalleRentaQuinta: {
      rentaBrutaAnualProyectada: rentaResult.rentaBrutaAnualProyectada,
      deduccion7UIT: rentaResult.deduccion7UIT,
      rentaNetaAnualImponible: rentaResult.rentaNetaAnualImponible,
      impuestoAnualProyectado: rentaResult.impuestoAnualProyectado,
    },
    detalleJson,
    baseLegal: [
      aportes.baseLegal,
      'TUO Ley IR (D.S. 179-2004-EF) Art. 75; Regl. D.S. 122-94-EF Art. 40',
      'Ley 26790 — EsSalud 9%',
    ].filter(Boolean),
  }
}

// FIX #2.A: round usa Money para precisión decimal.
function round(n: number): number {
  return money(n).toNumber()
}
