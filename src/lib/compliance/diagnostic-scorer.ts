import type { AnswerValue, AreaKey, ComplianceQuestion } from './questions/types'
import { AREAS } from './questions/types'
import { formatSoles } from '@/lib/format/peruvian'
import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'
import { comoVerificar, enunciadoDePregunta } from './diagnostic-guidance'

const UIT = PERU_LABOR.UIT

/** Máximo de brechas confirmadas (No / Parcial) que se guardan en `gapAnalysis`. */
const MAX_BRECHAS_CONFIRMADAS = 20
/** Máximo de acciones del plan (y de tareas que se crean). */
const MAX_ACCIONES = 15

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
  /** Preguntas del área (incluye las marcadas «No aplica»). */
  totalQuestions: number
  /** Preguntas que cuentan para el puntaje (excluye «No aplica»). */
  applicableQuestions: number
  answeredYes: number
  answeredPartial: number
  /** «No» o sin responder. */
  answeredNo: number
  /** «No sé»: cuentan como «No» en puntaje y multa, pero se reportan aparte. */
  answeredNoSe: number
  /** «No aplica»: fuera del puntaje, sin multa ni tarea. */
  answeredNoAplica: number
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
  /** NO, PARCIAL o NO_SE (los diagnósticos antiguos solo tienen NO / PARCIAL). */
  answer: AnswerValue
  priority: number // higher = more urgent
  /** Solo en respuestas «No sé»: qué documento buscar o a quién preguntar. */
  comoVerificar?: string
}

export interface DiagnosticResult {
  scoreGlobal: number
  scoreByArea: Record<AreaKey, number>
  totalMultaRiesgo: number
  areaScores: AreaScore[]
  /**
   * Brechas ordenadas por prioridad: las 20 confirmadas más urgentes (No /
   * Parcial) y todas las «Por verificar» (No sé), para que ninguna duda se pierda.
   */
  gapAnalysis: GapItem[]
  /** Solo las respuestas «No sé», ordenadas por prioridad. */
  porVerificar: GapItem[]
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
 * Factor por tamaño de empresa (escala simplificada de D.S. 019-2006-TR, Art. 48).
 * Lo comparten el puntaje y la multa estimada que se muestra en cada pregunta.
 */
export function workerFactorFor(totalWorkers: number): number {
  return totalWorkers <= 10 ? 1 : totalWorkers <= 50 ? 5 : totalWorkers <= 100 ? 10 : totalWorkers <= 500 ? 20 : 30
}

/**
 * Multa estimada (en soles, redondeada) si la pregunta no se cumple, para una
 * empresa de `totalWorkers` trabajadores. Es referencial: SUNAFIL calcula la
 * multa real según los trabajadores afectados y otros factores.
 */
export function estimarMultaPregunta(
  q: Pick<ComplianceQuestion, 'multaUIT'>,
  totalWorkers: number,
): number {
  return Math.round(q.multaUIT * UIT * workerFactorFor(totalWorkers))
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

/** Mayor prioridad primero; a igual prioridad, las brechas confirmadas antes que las «No sé». */
function byPriority(a: GapItem, b: GapItem): number {
  const noSe = (g: GapItem) => (g.answer === 'NO_SE' ? 1 : 0)
  return b.priority - a.priority || noSe(a) - noSe(b)
}

/**
 * Score a completed diagnostic based on answers.
 *
 * Cómo cuenta cada respuesta:
 *  - SI: 100 % del peso de la pregunta. Sin multa.
 *  - PARCIAL: 50 % del peso. Brecha con 30 % de la multa.
 *  - NO o sin responder: 0 %. Brecha con la multa completa.
 *  - NO_SE: igual que NO (0 % y multa completa, para no dar falsa
 *    tranquilidad), pero marcada «Por verificar» con la pista para averiguarlo.
 *  - NO_APLICA: sale del denominador (no suma ni resta), sin multa ni tarea.
 *    Si todas las preguntas de un área son «No aplica», el área no cuenta en el
 *    puntaje global.
 */
export function scoreDiagnostic(
  questions: ComplianceQuestion[],
  answers: QuestionAnswer[],
  totalWorkers: number
): DiagnosticResult {
  const answerMap = new Map(answers.map(a => [a.questionId, a]))
  // D.S. 019-2006-TR Art. 48 — escala de multas por tamaño empresarial
  const workerFactor = workerFactorFor(totalWorkers)

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
        totalQuestions: 0, applicableQuestions: 0,
        answeredYes: 0, answeredPartial: 0, answeredNo: 0, answeredNoSe: 0, answeredNoAplica: 0,
        multaEstimada: 0, gaps: [],
      })
      continue
    }

    let totalWeightedScore = 0
    let totalWeight = 0
    let answeredYes = 0
    let answeredPartial = 0
    let answeredNo = 0
    let answeredNoSe = 0
    let answeredNoAplica = 0
    let multaEstimada = 0
    const gaps: GapItem[] = []

    for (const q of areaQuestions) {
      const ans = answerMap.get(q.id)
      const answer = ans?.answer ?? null
      const qWeight = q.peso

      if (answer === 'NO_APLICA') {
        // Fuera del denominador: ni suma ni resta.
        answeredNoAplica++
        continue
      }

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
        // NO, NO_SE o sin responder: 0 puntos y multa completa.
        const multa = q.multaUIT * UIT * workerFactor
        multaEstimada += multa
        const esNoSe = answer === 'NO_SE'
        if (esNoSe) answeredNoSe++
        else answeredNo++
        gaps.push({
          questionId: q.id, text: q.text, baseLegal: q.baseLegal,
          gravedad: q.infraccionGravedad, multaUIT: q.multaUIT,
          multaPEN: Math.round(multa), answer: esNoSe ? 'NO_SE' : 'NO',
          priority: calculateGapPriority(q, multa),
          ...(esNoSe ? { comoVerificar: comoVerificar(q) } : {}),
        })
      }
    }

    const applicableQuestions = areaQuestions.length - answeredNoAplica
    // Si todo el área es «No aplica», no hay nada que evaluar: 100 y fuera del global.
    const score = applicableQuestions === 0
      ? 100
      : totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0
    gaps.sort(byPriority)

    areaScores.push({
      area: areaDef.key, label: areaDef.label, score, weight: areaDef.weight,
      totalQuestions: areaQuestions.length, applicableQuestions,
      answeredYes, answeredPartial, answeredNo, answeredNoSe, answeredNoAplica,
      multaEstimada: Math.round(multaEstimada), gaps,
    })

    allGaps.push(...gaps)
  }

  // Global score = weighted average (solo áreas con preguntas que aplican)
  let scoreGlobal = 0
  let totalWeightSum = 0
  for (const as of areaScores) {
    if (as.applicableQuestions > 0) {
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

  // Gap analysis: top 20 brechas confirmadas + todas las «Por verificar».
  allGaps.sort(byPriority)
  const confirmadas = allGaps.filter(g => g.answer !== 'NO_SE').slice(0, MAX_BRECHAS_CONFIRMADAS)
  const porVerificar = allGaps.filter(g => g.answer === 'NO_SE')
  const gapAnalysis = [...confirmadas, ...porVerificar].sort(byPriority)

  // Action plan (las «No aplica» nunca llegan aquí: no generan brecha)
  const questionById = new Map(questions.map(q => [q.id, q]))
  const actionPlan: ActionItem[] = gapAnalysis.slice(0, MAX_ACCIONES).map((gap, i) => {
    const q = questionById.get(gap.questionId)
    const areaDef = q ? AREAS.find(a => a.key === q.area) : undefined
    return {
      priority: i + 1,
      area: areaDef?.key || 'contratos_registro',
      areaLabel: areaDef?.label || '',
      questionId: gap.questionId,
      action: generateAction(gap),
      baseLegal: gap.baseLegal,
      multaEvitable: gap.multaPEN,
      // Se guarda tal cual ("dias" sin tilde): task-spawner y la UI lo leen así.
      plazoSugerido: gap.gravedad === 'MUY_GRAVE' ? 'Inmediato (7 dias)' : gap.gravedad === 'GRAVE' ? 'Corto plazo (30 dias)' : 'Mediano plazo (60 dias)',
    }
  })

  return {
    scoreGlobal,
    scoreByArea: scoreByArea as Record<AreaKey, number>,
    totalMultaRiesgo: Math.round(totalMultaRiesgo),
    areaScores,
    gapAnalysis,
    porVerificar,
    actionPlan,
  }
}

function generateAction(gap: GapItem): string {
  const enunciado = enunciadoDePregunta(gap.text)
  if (gap.answer === 'PARCIAL') {
    return `Completar el cumplimiento de: ${enunciado}. Base legal: ${gap.baseLegal}.`
  }
  if (gap.answer === 'NO_SE') {
    const pista = gap.comoVerificar ? ` Cómo averiguarlo: ${gap.comoVerificar}` : ''
    return `Verificar si se cumple: ${enunciado}.${pista} Si no se cumple, corrígelo antes de una inspección para evitar una multa estimada de ${formatSoles(gap.multaPEN)}. Base legal: ${gap.baseLegal}.`
  }
  return `Implementar: ${enunciado}. Subsanar antes de una posible inspección para evitar una multa de ${formatSoles(gap.multaPEN)}. Base legal: ${gap.baseLegal}.`
}
