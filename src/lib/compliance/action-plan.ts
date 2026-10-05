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
  if (input.source === 'training') return 'Registro de asistencia, evaluación o certificado emitido.'
  if (input.source === 'alert') return 'Alerta cerrada con sustento, fecha y responsable.'

  const text = `${input.area} ${input.title}`.toLowerCase()
  if (text.includes('sst') || text.includes('seguridad') || text.includes('salud') || text.includes('epp')) {
    return 'Documento SST firmado, evidencia de entrega o capacitación y registro actualizado.'
  }
  if (text.includes('contrato') || text.includes('registro') || text.includes('t-registro')) {
    return 'Contrato o adenda, o constancia del T-Registro, con cargo de comunicación.'
  }
  if (text.includes('planilla') || text.includes('remuner') || text.includes('boleta')) {
    return 'Cálculo, boleta o planilla corregida y constancia de pago, si aplica.'
  }
  if (text.includes('hostig') || text.includes('igualdad') || text.includes('discrimin')) {
    return 'Política o protocolo, acta de comunicación y capacitación interna.'
  }
  return 'Documento de subsanación, sustento legal y evidencia lista para la inspección.'
}

export function nextActionForAction(input: {
  source: ActionPlanSource
  severity: ActionPlanSeverity
  area: string
  title: string
}): string {
  if (input.source === 'training') return 'Cerrar la capacitación obligatoria con asistencia verificable.'
  if (input.source === 'alert') return 'Resolver la alerta y registrar el sustento de cierre.'

  const text = `${input.area} ${input.title}`.toLowerCase()
  if (text.includes('sst') || text.includes('epp')) return 'Subsanar en SST y cargar la evidencia firmada.'
  if (text.includes('contrato') || text.includes('registro')) return 'Regularizar el documento laboral y dejar el cargo de entrega.'
  if (text.includes('planilla') || text.includes('remuner')) return 'Corregir el cálculo o la planilla y sustentar el pago.'
  if (input.severity === 'CRITICAL') return 'Asignar un responsable hoy y cerrar la evidencia crítica.'
  return 'Asignar un responsable, una fecha de cierre y la evidencia esperada.'
}
