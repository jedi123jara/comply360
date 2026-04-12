/**
 * Contract Validator — Detecta irregularidades en datos extraídos de contratos
 * laborales peruanos. Las observaciones NO bloquean el guardado, pero se muestran
 * como advertencias y se guardan como alertas del trabajador.
 *
 * Basado en:
 *  - D.Leg. 728 / D.S. 003-97-TR (régimen general)
 *  - Ley 32353 (MYPE)
 *  - D.S. 019-2006-TR (infracciones SUNAFIL)
 *  - PERU_LABOR constantes actualizadas
 */

import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'

export interface ContractObservation {
  /** Tipo de observación */
  type: 'warning' | 'error' | 'info'
  /** Campo relacionado */
  field: string
  /** Mensaje descriptivo */
  message: string
  /** Base legal relevante */
  baseLegal?: string
}

interface WorkerDataForValidation {
  dni?: string
  firstName?: string
  lastName?: string
  position?: string
  regimenLaboral?: string
  tipoContrato?: string
  fechaIngreso?: string
  fechaFin?: string
  sueldoBruto?: number
  jornadaSemanal?: number
  asignacionFamiliar?: boolean
  tipoAporte?: string
}

/**
 * Valida los datos extraídos de un contrato y retorna observaciones.
 */
export function validateContractData(data: WorkerDataForValidation): ContractObservation[] {
  const obs: ContractObservation[] = []
  const RMV = PERU_LABOR.RMV // 1130 para 2026

  // ── 1. Sueldo por debajo de la RMV ────────────────────────────────────────
  if (data.sueldoBruto != null && data.sueldoBruto > 0) {
    if (data.tipoContrato === 'TIEMPO_PARCIAL') {
      // Tiempo parcial: proporcional a las horas
      const horas = data.jornadaSemanal || 24
      const rmvProporcional = Math.round((RMV * horas) / 48)
      if (data.sueldoBruto < rmvProporcional) {
        obs.push({
          type: 'error',
          field: 'sueldoBruto',
          message: `Sueldo S/${data.sueldoBruto} está por debajo de la RMV proporcional (S/${rmvProporcional} para ${horas}h/semana)`,
          baseLegal: 'D.S. 003-97-TR Art. 12',
        })
      }
    } else if (data.regimenLaboral !== 'MODALIDAD_FORMATIVA') {
      if (data.sueldoBruto < RMV) {
        obs.push({
          type: 'error',
          field: 'sueldoBruto',
          message: `Sueldo S/${data.sueldoBruto} está por debajo de la RMV vigente (S/${RMV})`,
          baseLegal: 'Constitución Art. 24 / D.S. 003-97-TR',
        })
      }
    }
  }

  // ── 2. Jornada excede el máximo legal ─────────────────────────────────────
  if (data.jornadaSemanal != null && data.jornadaSemanal > 48) {
    obs.push({
      type: 'error',
      field: 'jornadaSemanal',
      message: `Jornada de ${data.jornadaSemanal}h/semana excede el máximo legal de 48 horas`,
      baseLegal: 'Constitución Art. 25 / D.Leg. 854',
    })
  }

  // ── 3. Tiempo parcial con jornada >= 4 horas diarias ──────────────────────
  if (data.tipoContrato === 'TIEMPO_PARCIAL' && data.jornadaSemanal != null) {
    const horasDiarias = data.jornadaSemanal / 6 // 6 días laborables
    if (horasDiarias >= 4) {
      obs.push({
        type: 'warning',
        field: 'jornadaSemanal',
        message: `Contrato a tiempo parcial con ${horasDiarias.toFixed(1)}h/día (≥4h). Debería ser contrato regular con todos los beneficios`,
        baseLegal: 'D.S. 003-97-TR Art. 11-12',
      })
    }
  }

  // ── 4. Plazo fijo sin fecha de fin ────────────────────────────────────────
  if (data.tipoContrato === 'PLAZO_FIJO' && !data.fechaFin) {
    obs.push({
      type: 'warning',
      field: 'fechaFin',
      message: 'Contrato a plazo fijo sin fecha de término definida. Podría considerarse indeterminado',
      baseLegal: 'D.S. 003-97-TR Art. 72',
    })
  }

  // ── 5. Plazo fijo que excede 5 años ───────────────────────────────────────
  if (data.tipoContrato === 'PLAZO_FIJO' && data.fechaIngreso && data.fechaFin) {
    const inicio = new Date(data.fechaIngreso)
    const fin = new Date(data.fechaFin)
    const diffYears = (fin.getTime() - inicio.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    if (diffYears > 5) {
      obs.push({
        type: 'error',
        field: 'fechaFin',
        message: `Plazo fijo de ${diffYears.toFixed(1)} años excede el máximo legal de 5 años`,
        baseLegal: 'D.S. 003-97-TR Art. 74',
      })
    }
  }

  // ── 6. Contrato ya vencido ────────────────────────────────────────────────
  if (data.fechaFin) {
    const fin = new Date(data.fechaFin)
    const hoy = new Date()
    if (fin < hoy) {
      const diasVencido = Math.floor((hoy.getTime() - fin.getTime()) / (24 * 60 * 60 * 1000))
      obs.push({
        type: 'warning',
        field: 'fechaFin',
        message: `Contrato venció hace ${diasVencido} días (${data.fechaFin}). Verificar si fue renovado`,
        baseLegal: 'D.S. 003-97-TR Art. 77',
      })
    }
  }

  // ── 7. Fecha de ingreso en el futuro ──────────────────────────────────────
  if (data.fechaIngreso) {
    const inicio = new Date(data.fechaIngreso)
    const hoy = new Date()
    if (inicio > hoy) {
      obs.push({
        type: 'info',
        field: 'fechaIngreso',
        message: `Fecha de ingreso es futura (${data.fechaIngreso}). Verificar si es correcto`,
      })
    }
  }

  // ── 8. CAS con beneficios de régimen general ──────────────────────────────
  if (data.regimenLaboral === 'CAS' && data.asignacionFamiliar) {
    obs.push({
      type: 'warning',
      field: 'asignacionFamiliar',
      message: 'Régimen CAS normalmente no incluye asignación familiar del régimen general',
      baseLegal: 'D.Leg. 1057',
    })
  }

  // ── 9. Modalidad formativa con sueldo alto ────────────────────────────────
  if (data.regimenLaboral === 'MODALIDAD_FORMATIVA' && data.sueldoBruto != null && data.sueldoBruto > RMV) {
    obs.push({
      type: 'info',
      field: 'sueldoBruto',
      message: `Subvención de S/${data.sueldoBruto} supera la RMV. Verificar que sea modalidad formativa y no relación laboral encubierta`,
      baseLegal: 'Ley 28518 Art. 47',
    })
  }

  // ── 10. Sin aporte previsional (no es formativa) ──────────────────────────
  if (data.tipoAporte === 'SIN_APORTE' && data.regimenLaboral !== 'MODALIDAD_FORMATIVA') {
    obs.push({
      type: 'error',
      field: 'tipoAporte',
      message: 'Trabajador sin aporte previsional. Todo trabajador en planilla debe aportar a AFP u ONP',
      baseLegal: 'D.Ley 19990 / D.S. 054-97-EF (SPP)',
    })
  }

  // ── 11. DNI incompleto o sospechoso ───────────────────────────────────────
  if (data.dni && /^0{8}$/.test(data.dni)) {
    obs.push({
      type: 'error',
      field: 'dni',
      message: 'DNI 00000000 no es válido. Verificar documento de identidad',
    })
  }

  // ── 12. Nombre posiblemente incorrecto ────────────────────────────────────
  if (data.firstName && data.firstName === data.firstName.toUpperCase() && data.firstName.length > 2) {
    // No es un error, solo informativo
    obs.push({
      type: 'info',
      field: 'firstName',
      message: 'Nombre en MAYÚSCULAS. Se recomienda formato "Juan Carlos" para consistencia',
    })
  }

  return obs
}
