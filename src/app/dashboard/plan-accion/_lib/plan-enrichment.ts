/**
 * Datos extra que `/api/plan-accion` no entrega y que otras APIs ya exponen:
 *  - Base legal de cada tarea → `GET /api/compliance-tasks` (`baseLegal`).
 *  - Trabajador de cada alerta → `GET /api/workers/alerts` (`workerId`), para
 *    que "Resolver" lleve a la pestaña exacta de su ficha (legajo, contratos…).
 *
 * Es un enriquecimiento opcional: se pide después de pintar la bandeja y, si
 * falla (sin plan, sin red), la bandeja sigue funcionando con lo que trae la
 * API principal. No se modifica ninguna API.
 *
 * TODO(api): si `/api/plan-accion` empieza a devolver `baseLegal` y
 * `workerId` en cada item, este módulo puede eliminarse.
 */

export interface PlanEnrichment {
  /** `ComplianceTask.id` → base legal ("D.Leg. 728, Art. 4"). */
  taskLegalBasis: Record<string, string>
  /** `WorkerAlert.id` → id del trabajador. */
  alertWorkerIds: Record<string, string>
}

export const EMPTY_ENRICHMENT: PlanEnrichment = { taskLegalBasis: {}, alertWorkerIds: {} }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Lee `{ tasks: [{ id, baseLegal }] }` sin confiar en la forma de la respuesta. */
export function parseTaskLegalBasis(body: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  const tasks = isRecord(body) && Array.isArray(body.tasks) ? body.tasks : []
  for (const task of tasks) {
    if (!isRecord(task)) continue
    const id = typeof task.id === 'string' ? task.id : null
    const baseLegal = typeof task.baseLegal === 'string' ? task.baseLegal.trim() : ''
    if (id && baseLegal) out[id] = baseLegal
  }
  return out
}

/** Lee `{ data: [{ id, workerId }] }` sin confiar en la forma de la respuesta. */
export function parseAlertWorkerIds(body: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  const alerts = isRecord(body) && Array.isArray(body.data) ? body.data : []
  for (const alert of alerts) {
    if (!isRecord(alert)) continue
    const id = typeof alert.id === 'string' ? alert.id : null
    const workerId = typeof alert.workerId === 'string' ? alert.workerId.trim() : ''
    if (id && workerId) out[id] = workerId
  }
  return out
}

async function fetchJsonOrNull(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Pide solo lo necesario según qué tipos de pendientes hay en la bandeja. */
export async function fetchPlanEnrichment(
  needs: { tasks: boolean; alerts: boolean },
  signal?: AbortSignal,
): Promise<PlanEnrichment> {
  const [tasksBody, alertsBody] = await Promise.all([
    needs.tasks ? fetchJsonOrNull('/api/compliance-tasks?status=PENDING,IN_PROGRESS', signal) : null,
    needs.alerts ? fetchJsonOrNull('/api/workers/alerts', signal) : null,
  ])
  return {
    taskLegalBasis: parseTaskLegalBasis(tasksBody),
    alertWorkerIds: parseAlertWorkerIds(alertsBody),
  }
}
