/**
 * Task spawner — convierte el output de un diagnostico/simulacro en
 * filas accionables de `ComplianceTask`.
 *
 * Reglas:
 *  - Un task por cada item del action plan (diagnostico FULL/EXPRESS) o por cada
 *    hallazgo NO_CUMPLE/PARCIAL (simulacro SIMULATION).
 *  - Si ya existe un task abierto (PENDING/IN_PROGRESS) para el mismo
 *    `sourceId` dentro del mismo org, se omite para evitar duplicados en re-runs.
 *  - Los tasks se asocian al `diagnosticId` para trazabilidad.
 */
import { prisma } from '@/lib/prisma'
import type { ComplianceTaskStatus, InfracGravedad } from '@/generated/prisma/client'

export interface ActionItemInput {
  sourceId: string // questionId o solicitudId
  area: string
  priority: number
  title: string
  description?: string
  baseLegal?: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  multaEvitable: number
  plazoSugerido?: string
}

/**
 * Calcula `dueDate` a partir de `plazoSugerido` parseando patrones
 * conocidos ("Inmediato (7 dias)", "Corto plazo (30 dias)", etc).
 * Fallback: 30 días según gravedad.
 */
function computeDueDate(gravedad: InfracGravedad, plazoSugerido?: string): Date {
  const now = new Date()
  // Acepta "dias" (como se guarda hoy) y "días".
  const m = plazoSugerido?.match(/(\d+)\s*d[ií]as?/i)
  const dias = m ? Number(m[1]) : gravedad === 'MUY_GRAVE' ? 7 : gravedad === 'GRAVE' ? 30 : 60
  const due = new Date(now)
  due.setDate(due.getDate() + dias)
  return due
}

/**
 * Crea tasks en bloque para un diagnostico dado. Idempotente: si un task con
 * el mismo (orgId, sourceId) ya existe en estado abierto, lo ignora.
 *
 * @returns cantidad de tasks creadas (excluye duplicados saltados).
 */
export async function spawnTasksFromActionPlan(
  orgId: string,
  diagnosticId: string,
  items: ActionItemInput[]
): Promise<number> {
  if (items.length === 0) return 0

  // Filtra los que ya tienen task abierto (evita duplicados en re-runs).
  const sourceIds = items.map((i) => i.sourceId)
  const existing = await prisma.complianceTask.findMany({
    where: {
      orgId,
      sourceId: { in: sourceIds },
      status: { in: ['PENDING', 'IN_PROGRESS'] as ComplianceTaskStatus[] },
    },
    select: { sourceId: true },
  })
  const blocked = new Set(existing.map((e) => e.sourceId).filter((s): s is string => !!s))
  const fresh = items.filter((i) => !blocked.has(i.sourceId))
  if (fresh.length === 0) return 0

  const rows = fresh.map((item) => ({
    orgId,
    diagnosticId,
    sourceId: item.sourceId,
    area: item.area,
    priority: item.priority,
    title: item.title.slice(0, 255),
    description: item.description ?? null,
    baseLegal: item.baseLegal ?? null,
    gravedad: item.gravedad as InfracGravedad,
    multaEvitable: item.multaEvitable,
    plazoSugerido: item.plazoSugerido ?? null,
    dueDate: computeDueDate(item.gravedad as InfracGravedad, item.plazoSugerido),
  }))

  const result = await prisma.complianceTask.createMany({ data: rows })
  return result.count
}

const MAX_TITLE = 120

/** Recorta a `max` caracteres sin cortar palabras y agrega "…". */
function truncateTitle(text: string, max = MAX_TITLE): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '')}…`
}

/**
 * Título de la tarea. Con la pregunta del diagnóstico se usa el texto completo
 * (las preguntas pueden tener ":" o "." internos); sin ella, la primera frase de
 * la acción. Las respuestas «No sé» se marcan «Por verificar».
 */
export function taskTitleFor(
  gap: { text: string; answer?: string | null } | undefined,
  action: string,
): string {
  const base = gap?.text?.trim() ? gap.text : action.split(/\.|:/)[0]
  const prefix = gap?.answer === 'NO_SE' ? 'Por verificar: ' : ''
  return truncateTitle(`${prefix}${base.trim()}`)
}

/**
 * Mapea `DiagnosticResult.actionPlan` (scoreDiagnostic output) a `ActionItemInput[]`.
 * Las respuestas «No aplica» nunca llegan aquí (no generan brecha ni acción).
 */
export function actionPlanToTaskInputs(actionPlan: Array<{
  priority: number
  area: string
  areaLabel: string
  questionId: string
  action: string
  baseLegal: string
  multaEvitable: number
  plazoSugerido: string
}>, gapAnalysis: Array<{ questionId: string; gravedad: string; text: string; answer?: string | null }>): ActionItemInput[] {
  const gapByQ = new Map(gapAnalysis.map((g) => [g.questionId, g]))
  return actionPlan.map((item) => {
    const gap = gapByQ.get(item.questionId)
    const gravedad = (gap?.gravedad ?? 'LEVE') as 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
    return {
      sourceId: item.questionId,
      area: item.area,
      priority: item.priority,
      title: taskTitleFor(gap, item.action),
      description: item.action,
      baseLegal: item.baseLegal,
      gravedad,
      multaEvitable: item.multaEvitable,
      plazoSugerido: item.plazoSugerido,
    }
  })
}

/**
 * Mapea hallazgos del simulacro (NO_CUMPLE/PARCIAL) a `ActionItemInput[]`.
 */
export function simulacroHallazgosToTaskInputs(hallazgos: Array<{
  solicitudId: string
  estado: string
  documentoLabel: string
  baseLegal: string
  gravedad: string
  multaPEN: number
  mensaje: string
}>): ActionItemInput[] {
  // Solo procesa incumplimientos; ignora CUMPLE y NO_APLICA.
  const incumplimientos = hallazgos.filter(
    (h) => h.estado === 'NO_CUMPLE' || h.estado === 'PARCIAL'
  )
  // Ordena por gravedad (MUY_GRAVE primero) para que priority refleje urgencia.
  const gravityOrder: Record<string, number> = { MUY_GRAVE: 0, GRAVE: 1, LEVE: 2 }
  incumplimientos.sort((a, b) => (gravityOrder[a.gravedad] ?? 3) - (gravityOrder[b.gravedad] ?? 3))

  return incumplimientos.map((h, idx) => {
    const gravedad = (h.gravedad as 'LEVE' | 'GRAVE' | 'MUY_GRAVE') ?? 'LEVE'
    const plazoDias = gravedad === 'MUY_GRAVE' ? 10 : gravedad === 'GRAVE' ? 30 : 15
    const action =
      h.estado === 'NO_CUMPLE'
        ? `Implementar: ${h.documentoLabel}. ${h.mensaje}`
        : `Completar/renovar: ${h.documentoLabel}. ${h.mensaje}`
    return {
      sourceId: h.solicitudId,
      area: 'documentos_obligatorios',
      priority: idx + 1,
      title: h.documentoLabel.slice(0, 120),
      description: action,
      baseLegal: h.baseLegal,
      gravedad,
      multaEvitable: h.multaPEN,
      plazoSugerido: `${plazoDias} dias`,
    }
  })
}
