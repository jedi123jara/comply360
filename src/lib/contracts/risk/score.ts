// =============================================
// CONTRACT RISK SCORE — función pura
// Generador de Contratos / Chunk 5
//
// Combina los outputs de los chunks 1 (validación), 2 (régimen), 3 (chain)
// y 4 (cláusulas) en un score único 0-100 + nivel + estimación de multa.
//
// Convención del score:
//   100 = sin observaciones
//    80-100 = LOW
//    60-79  = MEDIUM
//    40-59  = HIGH
//    0-39   = CRITICAL
//
// Pesos (penalizaciones acumulativas):
//   - BLOCKER no acked: -30 c/u
//   - WARNING no acked: -5  c/u
//   - INFO            : -1  c/u
//   - Conflict de régimen detectado vs declarado: -15
//   - Cadena de hash rota: -25
//   - Sin contratos modales firmados pero contractType modal: ~no penaliza acá
//
// Estimación de multa SUNAFIL: aproximación gruesa basada en DS 019-2006-TR
// numerales más comunes (numeral 25.5 muy grave por desnaturalización =
// 4.50 UIT × trabajador para microempresa, escalando con tamaño).
// =============================================

import type { ValidationSeverity } from '@/generated/prisma/client'

const PENALTY = {
  BLOCKER_UNACKED: 30,
  WARNING_UNACKED: 5,
  INFO: 1,
  REGIME_CONFLICT: 15,
  CHAIN_BROKEN: 25,
} as const

// DS 019-2006-TR numeral 25.5 (muy grave) — base 4.50 UIT empresa pequeña/media.
// El reglamento SUNAFIL escala según número de trabajadores afectados; usamos
// 4.50 UIT como piso conservador.
const MULTA_BASE_UIT_PER_BLOCKER_DESNAT = 4.5

export interface RiskScoreInput {
  validations: {
    blockers: number
    warnings: number
    infos: number
    blockerUnacked: number
    warningUnacked: number
    blockerCodes: string[]
    warningCodes: string[]
  }
  regime?: {
    hasConflict: boolean
  }
  chain?: {
    valid: boolean
  }
  uitValue: number
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RiskScoreResult {
  score: number // 0-100
  level: RiskLevel
  penalties: Array<{ code: string; weight: number; reason: string }>
  estimatedFineUIT: number
  estimatedFinePEN: number
  /** True si hay BLOCKER que impide firmar/emitir el contrato. */
  hasBlockingIssues: boolean
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'LOW'
  if (score >= 60) return 'MEDIUM'
  if (score >= 40) return 'HIGH'
  return 'CRITICAL'
}

export function computeRiskScore(input: RiskScoreInput): RiskScoreResult {
  let score = 100
  const penalties: RiskScoreResult['penalties'] = []

  // BLOCKERs no acked: pesan fuerte. Acked se ignora (decisión informada del legal).
  if (input.validations.blockerUnacked > 0) {
    const w = input.validations.blockerUnacked * PENALTY.BLOCKER_UNACKED
    score -= w
    penalties.push({
      code: 'VALIDATION_BLOCKERS',
      weight: w,
      reason: `${input.validations.blockerUnacked} bloqueante${input.validations.blockerUnacked === 1 ? '' : 's'} sin reconocer (-${PENALTY.BLOCKER_UNACKED} c/u).`,
    })
  }

  if (input.validations.warningUnacked > 0) {
    const w = input.validations.warningUnacked * PENALTY.WARNING_UNACKED
    score -= w
    penalties.push({
      code: 'VALIDATION_WARNINGS',
      weight: w,
      reason: `${input.validations.warningUnacked} advertencia${input.validations.warningUnacked === 1 ? '' : 's'} sin reconocer (-${PENALTY.WARNING_UNACKED} c/u).`,
    })
  }

  if (input.validations.infos > 0) {
    const w = input.validations.infos * PENALTY.INFO
    score -= w
    penalties.push({
      code: 'VALIDATION_INFOS',
      weight: w,
      reason: `${input.validations.infos} sugerencia${input.validations.infos === 1 ? '' : 's'} (-${PENALTY.INFO} c/u).`,
    })
  }

  if (input.regime?.hasConflict) {
    score -= PENALTY.REGIME_CONFLICT
    penalties.push({
      code: 'REGIME_CONFLICT',
      weight: PENALTY.REGIME_CONFLICT,
      reason: 'El régimen declarado por la empresa difiere del detectado por el sistema.',
    })
  }

  if (input.chain && !input.chain.valid) {
    score -= PENALTY.CHAIN_BROKEN
    penalties.push({
      code: 'CHAIN_BROKEN',
      weight: PENALTY.CHAIN_BROKEN,
      reason: 'La cadena criptográfica de versiones del contrato está rota — posible alteración de datos.',
    })
  }

  const clamped = Math.max(0, Math.min(100, score))

  // Estimación de multa: cada BLOCKER que apunte a desnaturalización modal
  // (códigos MODAL-*, PLAZO-*, SUPLENCIA-*) entra a 4.5 UIT; los demás se
  // promedian en 1 UIT. FORMAL-* se penaliza como grave 24.7 = 1.57 UIT.
  let multaUIT = 0
  for (const code of input.validations.blockerCodes) {
    if (/^(MODAL|PLAZO|SUPLENCIA|GESTANTE|TPARCIAL|EXTRANJ)-/.test(code)) {
      multaUIT += MULTA_BASE_UIT_PER_BLOCKER_DESNAT
    } else if (/^FORMAL-/.test(code)) {
      multaUIT += 1.57
    } else {
      multaUIT += 1.0
    }
  }

  return {
    score: clamped,
    level: levelFromScore(clamped),
    penalties,
    estimatedFineUIT: Math.round(multaUIT * 100) / 100,
    estimatedFinePEN: Math.round(multaUIT * input.uitValue),
    hasBlockingIssues: input.validations.blockerUnacked > 0,
  }
}

// Helper para convertir el formato del engine de validación al input del scorer.
export function validationsToRiskInput(rows: Array<{
  severity: ValidationSeverity
  passed: boolean
  acknowledged: boolean
  ruleCode: string
}>) {
  const failed = rows.filter((r) => !r.passed)
  const blockers = failed.filter((r) => r.severity === 'BLOCKER')
  const warnings = failed.filter((r) => r.severity === 'WARNING')
  const infos = failed.filter((r) => r.severity === 'INFO')
  return {
    blockers: blockers.length,
    warnings: warnings.length,
    infos: infos.length,
    blockerUnacked: blockers.filter((r) => !r.acknowledged).length,
    warningUnacked: warnings.filter((r) => !r.acknowledged).length,
    blockerCodes: blockers.map((b) => b.ruleCode),
    warningCodes: warnings.map((w) => w.ruleCode),
  }
}
