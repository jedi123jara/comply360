/**
 * Diagnóstico de ejemplo para /dev/diagnostico-resultado.
 *
 * Usa el banco express real y el scorer real con respuestas mezcladas (Sí,
 * Parcial, No, No sé y un área entera «No aplica»), así la vista previa muestra
 * lo mismo que vería una empresa: brechas, «Por verificar» y áreas que no aplican.
 */
import { scoreDiagnostic, type QuestionAnswer } from '@/lib/compliance/diagnostic-scorer'
import { ALL_QUESTIONS, EXPRESS_QUESTIONS } from '@/lib/compliance/questions'
import type { AnswerOption } from '@/lib/compliance/questions'

export const PREVIEW_DIAGNOSTIC_ID = 'diagnostico-ejemplo'

const CICLO: AnswerOption[] = ['SI', 'NO', 'PARCIAL', 'NO_SE', 'SI', 'SI']

function buildAnswers(): QuestionAnswer[] {
  const areas = [...new Set(EXPRESS_QUESTIONS.map((q) => q.area))]
  // La última área del banco express queda entera como «No aplica».
  const areaNoAplica = areas[areas.length - 1]
  return EXPRESS_QUESTIONS.map((q, i) => ({
    questionId: q.id,
    answer: q.area === areaNoAplica ? 'NO_APLICA' : CICLO[i % CICLO.length],
  }))
}

export function buildPreviewDiagnostic() {
  const answers = buildAnswers()
  const result = scoreDiagnostic(EXPRESS_QUESTIONS, answers, 42)
  const completedAt = new Date().toISOString()
  return {
    id: PREVIEW_DIAGNOSTIC_ID,
    type: 'EXPRESS',
    scoreGlobal: result.scoreGlobal,
    scoreByArea: result.scoreByArea,
    totalMultaRiesgo: result.totalMultaRiesgo,
    questionsJson: answers,
    gapAnalysis: result.gapAnalysis,
    actionPlan: result.actionPlan,
    completedAt,
    createdAt: completedAt,
  }
}

/** Historial corto para el gráfico de evolución. */
export function buildPreviewDiagnosticHistory() {
  const actual = buildPreviewDiagnostic()
  const DAY_MS = 24 * 60 * 60 * 1000
  const antes = (dias: number, score: number) => {
    const date = new Date(Date.now() - dias * DAY_MS).toISOString()
    return {
      id: `diagnostico-${dias}`,
      type: 'EXPRESS',
      scoreGlobal: score,
      totalMultaRiesgo: actual.totalMultaRiesgo * 1.4,
      completedAt: date,
      createdAt: date,
    }
  }
  return [antes(90, Math.max(0, actual.scoreGlobal - 18)), antes(45, Math.max(0, actual.scoreGlobal - 7))]
}

/** Respuesta de `GET /api/diagnostics?action=questions` con el banco real. */
export function buildPreviewQuestions(type: string | null) {
  const questions = type === 'FULL' ? ALL_QUESTIONS : EXPRESS_QUESTIONS
  return {
    type: type === 'FULL' ? 'FULL' : 'EXPRESS',
    totalQuestions: questions.length,
    questions,
    context: { totalWorkers: 42, sizeRange: '11-50', regimenPrincipal: 'GENERAL' },
  }
}
