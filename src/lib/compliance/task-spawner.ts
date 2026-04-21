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
  const m = plazoSugerido?.match(/(\d+)\s*dias?/i)
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

/**
 * Mapea `DiagnosticResult.actionPlan` (scoreDiagnostic output) a `ActionItemInput[]`.
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
}>, gapAnalysis: Array<{ questionId: string; gravedad: string; text: string }>): ActionItemInput[] {
  const gapByQ = new Map(gapAnalysis.map((g) => [g.questionId, g]))
  return actionPlan.map((item) => {
    const gap = gapByQ.get(item.questionId)
    const gravedad = (gap?.gravedad ?? 'LEVE') as 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
    return {
      sourceId: item.questionId,
      area: item.area,
      priority: item.priority,
      // Título = primeras 120 chars de la acción, antes de primer punto si hay
      title: (gap?.text ?? item.action).split(/\.|:/)[0].trim().slice(0, 120),
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
