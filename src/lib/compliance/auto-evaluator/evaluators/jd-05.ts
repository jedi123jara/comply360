/**
 * JD-05: Descanso semanal obligatorio de 24 horas consecutivas?
 * Base legal: D.Leg. 713, Art. 1
 *
 * Lógica: para cada worker activo, verificar que en la última semana
 * hay al menos un día sin Attendance (descanso).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorJD05: QuestionEvaluator = {
  questionId: 'JD-05',
  evaluate: (ctx) => {
    if (ctx.attendanceRecent.length === 0) {
      return {
        questionId: 'JD-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Asistencias registradas', 0)],
        sources: ['Attendance'],
      }
    }
    const sevenDaysAgo = new Date(ctx.now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const ultimaSemana = ctx.attendanceRecent.filter((a) => a.workDate >= sevenDaysAgo)
    if (ultimaSemana.length === 0) {
      return {
        questionId: 'JD-05',
        answer: null,
        confidence: 80,
        evidence: [metricEvidence('Asistencias última semana', 0)],
        sources: ['Attendance.workDate'],
      }
    }
    const porWorker = new Map<string, number>()
    for (const a of ultimaSemana) {
      porWorker.set(a.workerId, (porWorker.get(a.workerId) ?? 0) + 1)
    }
    // Worker con 7 días seguidos sin descanso → infracción
    const cumplen = Array.from(porWorker.entries()).filter(([, count]) => count <= 6)
    const total = porWorker.size
    if (total === 0) {
      return {
        questionId: 'JD-05',
        answer: null,
        confidence: 80,
        evidence: [metricEvidence('Trabajadores con asistencia en semana', 0)],
        sources: ['Attendance'],
      }
    }
    const pct = Math.round((cumplen.length / total) * 100)
    return {
      questionId: 'JD-05',
      answer: pctToAnswer(pct),
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores con asistencia en última semana', total),
        metricEvidence('Con descanso semanal respetado', `${pct}%`),
      ],
      sources: ['Attendance'],
    }
  },
}
