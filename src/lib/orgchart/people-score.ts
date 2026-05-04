/**
 * Score individual de compliance de un trabajador (Trombinoscopio).
 *
 * Pure function — fácil de testear.
 *
 * El score combina 3 señales:
 *   - legajoScore (0-100): completitud documental (más alto = mejor)
 *   - alertSeverities: alertas pendientes con severidad
 *   - contractType: contratos de "alto riesgo" (locación de servicios sin
 *     evidencia, plazo fijo continuamente renovado, etc.)
 *
 * El score final SE INTERPRETA AL REVÉS de legajoScore: aquí 100 = sin
 * riesgo, 0 = riesgo total. Esto es para alinear con el Heatmap (verde=OK).
 */

export type ToneSeverity = 'success' | 'warning' | 'danger' | 'critical'

export interface WorkerScoreInput {
  legajoScore: number | null
  contractType: string
  hireDate: Date | string
  alertSeverities: string[] // ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
}

export interface WorkerScoreResult {
  score: number // 0-100
  tone: ToneSeverity
  reasons: string[]
  contractAtRisk: boolean
}

const ALERT_PENALTY: Record<string, number> = {
  CRITICAL: 30,
  HIGH: 18,
  MEDIUM: 8,
  LOW: 3,
}

const HIGH_RISK_CONTRACTS = [
  'LOCACION_SERVICIOS',
  'LOCACION',
  'SERVICIO',
  'TERCEROS',
]

export function computeWorkerComplianceScore(
  input: WorkerScoreInput,
): WorkerScoreResult {
  const reasons: string[] = []

  // 1) Base = legajoScore (lo invertimos: legajo bajo = riesgo alto)
  const legajo = input.legajoScore ?? 80 // si no hay legajo, asumimos 80 (neutral)
  let score = legajo
  if (legajo < 50) reasons.push(`Legajo incompleto (${legajo}%)`)
  else if (legajo < 80) reasons.push(`Legajo parcial (${legajo}%)`)

  // 2) Penalizar por alertas
  for (const sev of input.alertSeverities) {
    const penalty = ALERT_PENALTY[sev] ?? 0
    score -= penalty
  }
  const criticalCount = input.alertSeverities.filter((s) => s === 'CRITICAL').length
  const highCount = input.alertSeverities.filter((s) => s === 'HIGH').length
  if (criticalCount > 0)
    reasons.push(`${criticalCount} alerta${criticalCount > 1 ? 's' : ''} crítica${criticalCount > 1 ? 's' : ''}`)
  if (highCount > 0)
    reasons.push(`${highCount} alerta${highCount > 1 ? 's' : ''} de severidad alta`)

  // 3) Contrato de alto riesgo
  const upper = input.contractType.toUpperCase()
  const contractAtRisk = HIGH_RISK_CONTRACTS.some((r) => upper.includes(r))
  if (contractAtRisk) {
    score -= 12
    reasons.push('Contrato civil con riesgo de desnaturalización')
  }

  // 4) Antigüedad sin contrato indefinido (>4 años con plazo fijo es riesgo)
  const tenureYears =
    (Date.now() - new Date(input.hireDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000)
  if (
    tenureYears > 4 &&
    (upper.includes('PLAZO') || upper.includes('MODAL') || upper.includes('TEMPORAL'))
  ) {
    score -= 10
    reasons.push('Más de 4 años con contrato a plazo (presunción de indeterminación)')
  }

  // Cap
  score = Math.max(0, Math.min(100, Math.round(score)))

  let tone: ToneSeverity
  if (score >= 85) tone = 'success'
  else if (score >= 65) tone = 'warning'
  else if (score >= 40) tone = 'danger'
  else tone = 'critical'

  return { score, tone, reasons, contractAtRisk }
}
