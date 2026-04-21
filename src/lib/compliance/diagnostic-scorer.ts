import type { AnswerValue, AreaKey, ComplianceQuestion } from './questions/types'
import { AREAS } from './questions/types'

const UIT = 5500 // 2026

export interface QuestionAnswer {
  questionId: string
  answer: AnswerValue
  evidenceUrl?: string
  notes?: string
}

export interface AreaScore {
  area: AreaKey
  label: string
  score: number // 0-100
  weight: number
  totalQuestions: number
  answeredYes: number
  answeredPartial: number
  answeredNo: number
  multaEstimada: number
  gaps: GapItem[]
}

export interface GapItem {
  questionId: string
  text: string
  baseLegal: string
  gravedad: string
  multaUIT: number
  multaPEN: number
  answer: AnswerValue
  priority: number // higher = more urgent
}

export interface DiagnosticResult {
  scoreGlobal: number
  scoreByArea: Record<AreaKey, number>
  totalMultaRiesgo: number
  areaScores: AreaScore[]
  gapAnalysis: GapItem[]
  actionPlan: ActionItem[]
}

export interface ActionItem {
  priority: number
  area: AreaKey
  areaLabel: string
  questionId: string
  action: string
  baseLegal: string
  multaEvitable: number
  plazoSugerido: string
}

/**
 * Calculate gap priority considering:
 * 1. Severity multiplier (MUY_GRAVE=3, GRAVE=2, LEVE=1)
 * 2. Question weight (1-5)
 * 3. Multa amount normalized (higher multa = higher priority)
 * 4. Detectability bonus (SUNAFIL detects some infractions automatically)
 */
function calculateGapPriority(q: ComplianceQuestion, multaPEN: number): number {
  const gravityFactor = q.infraccionGravedad === 'MUY_GRAVE' ? 3 : q.infraccionGravedad === 'GRAVE' ? 2 : 1
  const weightScore = q.peso * gravityFactor  // 1-15
  const multaScore = Math.min(multaPEN / 10000, 10) // normalize to 0-10
  // Higher priority for areas SUNAFIL checks first (contracts, T-REGISTRO, RMV)
  const detectionBonus = ['contratos_registro', 'remuneraciones_beneficios', 'sst'].includes(q.area) ? 2 : 0
  return Math.round((weightScore + multaScore + detectionBonus) * 100) / 100
}

/**
 * Score a completed diagnostic based on answers
 */
export function scoreDiagnostic(
  questions: ComplianceQuestion[],
  answers: QuestionAnswer[],
  totalWorkers: number
): DiagnosticResult {
  const answerMap = new Map(answers.map(a => [a.questionId, a]))
  // D.S. 019-2006-TR Art. 48 — escala correcta de multas por tamaño empresarial
  const workerFactor = totalWorkers <= 10 ? 1 : totalWorkers <= 50 ? 5 : totalWorkers <= 100 ? 10 : totalWorkers <= 500 ? 20 : 30

  // Group questions by area
  const byArea = new Map<AreaKey, ComplianceQuestion[]>()
  for (const q of questions) {
    const list = byArea.get(q.area) || []
    list.push(q)
    byArea.set(q.area, list)
  }

  const areaScores: AreaScore[] = []
  const allGaps: GapItem[] = []

  for (const areaDef of AREAS) {
    const areaQuestions = byArea.get(areaDef.key) || []
    if (areaQuestions.length === 0) {
      areaScores.push({
        area: areaDef.key, label: areaDef.label, score: 100, weight: areaDef.weight,
        totalQuestions: 0, answeredYes: 0, answeredPartial: 0, answeredNo: 0,
        multaEstimada: 0, gaps: [],
      })
      continue
    }

    let totalWeightedScore = 0
    let totalWeight = 0
    let answeredYes = 0
    let answeredPartial = 0
    let answeredNo = 0
    let multaEstimada = 0
    const gaps: GapItem[] = []

    for (const q of areaQuestions) {
      const ans = answerMap.get(q.id)
      const answer = ans?.answer ?? null
      const qWeight = q.peso

      totalWeight += qWeight

      if (answer === 'SI') {
        totalWeightedScore += qWeight * 100
        answeredYes++
      } else if (answer === 'PARCIAL') {
        totalWeightedScore += qWeight * 50
        answeredPartial++
        const multa = q.multaUIT * UIT * workerFactor * 0.3 // partial compliance = 30% risk
        multaEstimada += multa
        gaps.push({
          questionId: q.id, text: q.text, baseLegal: q.baseLegal,
          gravedad: q.infraccionGravedad, multaUIT: q.multaUIT,
          multaPEN: Math.round(multa), answer: 'PARCIAL',
          priority: calculateGapPriority(q, multa),
        })
      } else {
        // NO or unanswered
        answeredNo++
        const multa = q.multaUIT * UIT * workerFactor
        multaEstimada += multa
        gaps.push({
          questionId: q.id, text: q.text, baseLegal: q.baseLegal,
          gravedad: q.infraccionGravedad, multaUIT: q.multaUIT,
          multaPEN: Math.round(multa), answer: answer ?? 'NO',
          priority: calculateGapPriority(q, multa),
        })
      }
    }

    const score = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0
    gaps.sort((a, b) => b.priority - a.priority)

    areaScores.push({
      area: areaDef.key, label: areaDef.label, score, weight: areaDef.weight,
      totalQuestions: areaQuestions.length, answeredYes, answeredPartial, answeredNo,
      multaEstimada: Math.round(multaEstimada), gaps,
    })

    allGaps.push(...gaps)
  }

  // Global score = weighted average
  let scoreGlobal = 0
  let totalWeightSum = 0
  for (const as of areaScores) {
    if (as.totalQuestions > 0) {
      scoreGlobal += as.score * as.weight
      totalWeightSum += as.weight
    }
  }
  scoreGlobal = totalWeightSum > 0 ? Math.round(scoreGlobal / totalWeightSum) : 0

  // Score by area map
  const scoreByArea: Record<string, number> = {}
  for (const as of areaScores) {
    scoreByArea[as.area] = as.score
  }

  // Total multa
  const totalMultaRiesgo = areaScores.reduce((sum, as) => sum + as.multaEstimada, 0)

  // Gap analysis: top gaps sorted by priority
  allGaps.sort((a, b) => b.priority - a.priority)
  const gapAnalysis = allGaps.slice(0, 20) // Top 20

  // Action plan
  const actionPlan: ActionItem[] = gapAnalysis.slice(0, 15).map((gap, i) => {
    const areaDef = AREAS.find(a => {
      const q = questions.find(q2 => q2.id === gap.questionId)
      return q && q.area === a.key
    })
    return {
      priority: i + 1,
      area: areaDef?.key || 'contratos_registro',
      areaLabel: areaDef?.label || '',
      questionId: gap.questionId,
      action: generateAction(gap),
      baseLegal: gap.baseLegal,
      multaEvitable: gap.multaPEN,
      plazoSugerido: gap.gravedad === 'MUY_GRAVE' ? 'Inmediato (7 dias)' : gap.gravedad === 'GRAVE' ? 'Corto plazo (30 dias)' : 'Mediano plazo (60 dias)',
    }
  })

  return {
    scoreGlobal,
    scoreByArea: scoreByArea as Record<AreaKey, number>,
    totalMultaRiesgo: Math.round(totalMultaRiesgo),
    areaScores,
    gapAnalysis,
    actionPlan,
  }
}

function generateAction(gap: GapItem): string {
  if (gap.answer === 'PARCIAL') {
    return `Completar el cumplimiento de: ${gap.text.replace(/\?$/, '')}. Base legal: ${gap.baseLegal}.`
  }
  return `Implementar: ${gap.text.replace(/\?$/, '')}. Subsanar antes de posible inspeccion para evitar multa de S/ ${gap.multaPEN.toLocaleString()}. Base legal: ${gap.baseLegal}.`
}
