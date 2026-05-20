/**
 * Helpers compartidos por todos los evaluators.
 *
 * Reglas:
 *  - Cada función es pura y determinística.
 *  - No hace I/O — todo el data viene del EvaluatorContext.
 */

import type { AutoAnswerValue, Evidence, EvaluatorContext, WorkerForEvaluator } from '../types'

/**
 * Convierte un porcentaje de cumplimiento (0-100) en una respuesta:
 *  - 100%  → SI
 *  - 80%+  → PARCIAL
 *  - resto → NO
 */
export function pctToAnswer(pct: number): AutoAnswerValue {
  if (pct >= 100) return 'SI'
  if (pct >= 80) return 'PARCIAL'
  return 'NO'
}

/**
 * Porcentaje de workers que cumplen un predicado. Si no hay workers,
 * retorna 100 (no aplica → no penaliza).
 */
export function workerPct(
  ctx: EvaluatorContext,
  predicate: (w: WorkerForEvaluator) => boolean
): number {
  if (ctx.workerCount === 0) return 100
  const ok = ctx.workers.filter(predicate).length
  return Math.round((ok / ctx.workerCount) * 100)
}

/** Lista compacta de workers afectados (los que NO cumplen el predicado). */
export function affectedWorkers(
  ctx: EvaluatorContext,
  predicate: (w: WorkerForEvaluator) => boolean,
  limit = 5
): WorkerForEvaluator[] {
  return ctx.workers.filter((w) => !predicate(w)).slice(0, limit)
}

/** Construye un Evidence item por worker afectado. */
export function workerEvidence(w: WorkerForEvaluator, label?: string): Evidence {
  return {
    type: 'worker',
    label: label ?? 'Trabajador',
    value: `${w.firstName} ${w.lastName} (${w.dni})`,
    href: `/dashboard/trabajadores/${w.id}`,
    workerId: w.id,
  }
}

/** Métricas comunes: total, porcentaje, count afectados. */
export function metricEvidence(label: string, value: string | number): Evidence {
  return { type: 'metric', label, value: String(value) }
}

/** Link a un documento u otra ruta. */
export function linkEvidence(label: string, value: string, href: string): Evidence {
  return { type: 'link', label, value, href }
}

/** Marca el inicio de un mes en zona horaria America/Lima. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Devuelve "2026-04" desde una fecha. */
export function periodString(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

/** Devuelve true si hay al menos un OrgDocument vigente del tipo dado. */
export function hasOrgDocument(ctx: EvaluatorContext, type: string): boolean {
  return ctx.orgDocuments.some((d) => d.type === type)
}

/** Devuelve el doc más reciente del tipo dado, o null. */
export function latestOrgDocument(ctx: EvaluatorContext, type: string) {
  const matches = ctx.orgDocuments.filter((d) => d.type === type)
  if (matches.length === 0) return null
  return matches.reduce((latest, d) =>
    !latest || (d.publishedAt && (!latest.publishedAt || d.publishedAt > latest.publishedAt))
      ? d
      : latest
  )
}

/**
 * Verifica si una constancia está vigente:
 *  - validUntil > now → SI
 *  - validUntil null → asumimos vigente (no expira)
 *  - validUntil <= now → NO
 */
export function isOrgDocumentVigente(
  ctx: EvaluatorContext,
  type: string,
  now: Date = ctx.now
): { has: boolean; vigente: boolean; daysUntilExpiry: number | null; docId: string | null } {
  const doc = latestOrgDocument(ctx, type)
  if (!doc) return { has: false, vigente: false, daysUntilExpiry: null, docId: null }
  if (!doc.validUntil) return { has: true, vigente: true, daysUntilExpiry: null, docId: doc.id }
  const daysUntilExpiry = Math.ceil(
    (doc.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  return {
    has: true,
    vigente: daysUntilExpiry > 0,
    daysUntilExpiry,
    docId: doc.id,
  }
}

/** Devuelve true si hay al menos un SstRecord vigente del tipo dado. */
export function hasSstRecord(ctx: EvaluatorContext, type: string): boolean {
  return ctx.sstRecords.some((r) => r.type === type)
}

/** Workers con jornada nocturna o mixta. */
export function workersNocturnos(ctx: EvaluatorContext): WorkerForEvaluator[] {
  return ctx.workers.filter((w) => w.tipoJornada === 'NOCTURNO' || w.tipoJornada === 'MIXTO')
}

/** RMV vigente 2026. */
export const RMV_2026 = 1130

/** UIT 2026. */
export const UIT_2026 = 5500
