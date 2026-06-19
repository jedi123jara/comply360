export type ActionPlanSource = 'task' | 'alert' | 'training'
export type ActionPlanSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type ActionPlanLane = 'today' | 'week' | 'month' | 'backlog'

interface RiskInput {
  severity: ActionPlanSeverity
  dueDate: string | Date | null
  multaEvitable?: number | null
  source?: ActionPlanSource
}

const MS_DAY = 24 * 60 * 60 * 1000

const SEVERITY_SCORE: Record<ActionPlanSeverity, number> = {
  CRITICAL: 84,
  HIGH: 68,
  MEDIUM: 46,
  LOW: 24,
}

export function daysUntil(dueDate: string | Date | null, now = new Date()): number | null {
  if (!dueDate) return null
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) return null
  const days = Math.ceil((due.getTime() - now.getTime()) / MS_DAY)
  return Object.is(days, -0) ? 0 : days
}

export function classifyActionLane(input: Pick<RiskInput, 'severity' | 'dueDate'>, now = new Date()): ActionPlanLane {
  const daysLeft = daysUntil(input.dueDate, now)
  if (daysLeft !== null && daysLeft <= 0) return 'today'
  if (input.severity === 'CRITICAL' || (daysLeft !== null && daysLeft <= 7)) return 'week'
  if (input.severity === 'HIGH' || (daysLeft !== null && daysLeft <= 30)) return 'month'
  return 'backlog'
}

export function computeActionRiskScore(input: RiskInput, now = new Date()): number {
  let score = SEVERITY_SCORE[input.severity]
  const daysLeft = daysUntil(input.dueDate, now)
  const multa = input.multaEvitable ?? 0

  if (daysLeft !== null) {
    if (daysLeft <= 0) score += 16
    else if (daysLeft <= 7) score += 11
    else if (daysLeft <= 30) score += 5
  }

  if (multa >= 25000) score += 10
  else if (multa >= 10000) score += 7
  else if (multa >= 3000) score += 4

  if (input.source === 'alert') score += 4
  if (input.source === 'training') score -= 3

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function evidenceGoalForAction(input: {
  source: ActionPlanSource
  area: string
  title: string
}): string {
  if (input.source === 'training') return 'Registro de asistencia, evaluacion o certificado emitido.'
  if (input.source === 'alert') return 'Alerta cerrada con sustento, fecha y responsable.'

  const text = `${input.area} ${input.title}`.toLowerCase()
  if (text.includes('sst') || text.includes('seguridad') || text.includes('salud') || text.includes('epp')) {
    return 'Documento SST firmado, evidencia de entrega/capacitacion y registro actualizado.'
  }
  if (text.includes('contrato') || text.includes('registro') || text.includes('t-registro')) {
    return 'Contrato/adenda o constancia T-Registro con cargo de comunicacion.'
  }
  if (text.includes('planilla') || text.includes('remuner') || text.includes('boleta')) {
    return 'Calculo, boleta/planilla corregida y constancia de pago si aplica.'
  }
  if (text.includes('hostig') || text.includes('igualdad') || text.includes('discrimin')) {
    return 'Politica/protocolo, acta de comunicacion y capacitacion interna.'
  }
  return 'Documento de subsanacion, sustento legal y evidencia lista para inspeccion.'
}

export function nextActionForAction(input: {
  source: ActionPlanSource
  severity: ActionPlanSeverity
  area: string
  title: string
}): string {
  if (input.source === 'training') return 'Cerrar capacitacion obligatoria con asistencia verificable.'
  if (input.source === 'alert') return 'Resolver alerta y registrar el sustento de cierre.'

  const text = `${input.area} ${input.title}`.toLowerCase()
  if (text.includes('sst') || text.includes('epp')) return 'Subsanar en SST y cargar evidencia firmada.'
  if (text.includes('contrato') || text.includes('registro')) return 'Regularizar documento laboral y dejar cargo.'
  if (text.includes('planilla') || text.includes('remuner')) return 'Corregir calculo/planilla y sustentar pago.'
  if (input.severity === 'CRITICAL') return 'Asignar responsable hoy y cerrar evidencia critica.'
  return 'Asignar responsable, fecha de cierre y evidencia esperada.'
}
