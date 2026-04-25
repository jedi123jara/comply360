/**
 * Handler que conecta el event bus con el engine de workflows.
 *
 * Flujo:
 *  1. Recibe un `DomainEvent` con `name` y `payload.orgId`
 *  2. Busca en DB los `Workflow` activos con `triggerId === 'event.{name}'`
 *  3. Por cada match, calcula una `idempotencyKey` determinística e intenta
 *     crear la `WorkflowRun` placeholder. Si la key ya existe (Prisma unique
 *     violation P2002), se trata como duplicado y se ignora silenciosamente.
 *  4. Con el claim asegurado, invoca al engine y update la fila con
 *     resultados reales.
 *  5. Protección anti-loop: si el payload trae `_emittedBy` con el workflow
 *     actual o ya excede depth máximo (3), se saltea.
 *
 * Decisión: llamamos al `workflowEngine` directamente (no a
 * `runWorkflow()` de persistence.ts) para evitar que se cree una fila
 * adicional sin idempotencyKey. `runWorkflow()` sigue en uso para disparos
 * manuales desde la UI.
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import {
  workflowEngine,
  type WorkflowDefinition,
  type WorkflowStep,
} from '@/lib/workflows/engine'
import { getEntityId, type DomainEvent, type EventName } from '../catalog'

const TRIGGER_PREFIX = 'event.'
const MAX_EMIT_DEPTH = 3

/**
 * Calcula la idempotencyKey. Misma key → unique constraint rechaza el insert
 * y el handler trata el evento como duplicado.
 *
 * Shape: sha256(workflowId + eventName + entityId + minuteBucket)
 *   - minuteBucket redondea al minuto (retries dentro de 60s se deduplican)
 *   - La ventana de 1min coincide con el default de retry de fetch (30-60s)
 */
export function computeIdempotencyKey(params: {
  workflowId: string
  eventName: string
  entityId: string
  emittedAt: Date
}): string {
  const minuteBucket = Math.floor(params.emittedAt.getTime() / 60_000)
  const input = `${params.workflowId}:${params.eventName}:${params.entityId}:${minuteBucket}`
  return createHash('sha256').update(input).digest('hex').slice(0, 32)
}

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code === 'P2002'
  return false
}

// ═══════════════════════════════════════════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════════════════════════════════════════

export async function workflowHandler<K extends EventName>(event: DomainEvent<K>): Promise<void> {
  const { name, payload } = event
  const orgId = payload.orgId
  if (!orgId) return

  // Anti-loop global: máxima profundidad del linaje de emisión.
  const chain = payload._emittedBy ?? []
  if (chain.length >= MAX_EMIT_DEPTH) {
    console.warn(`[workflow-handler] loop prevenido: depth=${chain.length} en ${name}`)
    return
  }

  const triggerId = `${TRIGGER_PREFIX}${name}`
  const workflows = await prisma.workflow.findMany({
    where: { orgId, active: true, triggerId },
  })

  if (workflows.length === 0) return

  const entityId = getEntityId(event) || 'noentity'
  const emittedAt = new Date(event.emittedAt)

  for (const wfRow of workflows) {
    // Anti-loop per-workflow: si ya apareció en la cadena, saltear.
    if (chain.includes(wfRow.id)) continue

    const idempotencyKey = computeIdempotencyKey({
      workflowId: wfRow.id,
      eventName: name,
      entityId,
      emittedAt,
    })

    const triggerData = {
      ...payload,
      _event: { id: event.id, name: event.name, emittedAt: event.emittedAt },
      _emittedBy: [...chain, wfRow.id],
    }

    // ── Paso 1: claim de idempotencyKey ─────────────────────────────────
    let placeholderId: string
    try {
      const placeholder = await prisma.workflowRun.create({
        data: {
          orgId,
          workflowId: wfRow.id,
          status: 'PENDING',
          triggerData: triggerData as Prisma.InputJsonValue,
          stepResultsJson: [] as Prisma.InputJsonValue,
          idempotencyKey,
          triggeredBy: `event:${name}`,
        },
      })
      placeholderId = placeholder.id
    } catch (err) {
      if (isUniqueViolation(err)) continue // duplicado, seguimos con el siguiente workflow
      console.error(`[workflow-handler] create placeholder falló en ${name}`, err)
      continue
    }

    // ── Paso 2: ejecutar engine con la definición cargada ───────────────
    try {
      const definition: WorkflowDefinition = {
        id: wfRow.id,
        orgId: wfRow.orgId,
        name: wfRow.name,
        description: wfRow.description ?? '',
        version: wfRow.version,
        active: wfRow.active,
        triggerId: wfRow.triggerId,
        steps: (wfRow.stepsJson as unknown as WorkflowStep[]) ?? [],
        createdAt: wfRow.createdAt.toISOString(),
        updatedAt: wfRow.updatedAt.toISOString(),
      }

      workflowEngine.registerWorkflow(definition)
      const execution = await workflowEngine.executeWorkflow(wfRow.id, triggerData)

      await prisma.workflowRun.update({
        where: { id: placeholderId },
        data: {
          status: execution.status,
          stepResultsJson: execution.stepResults as unknown as Prisma.InputJsonValue,
          context: (execution.context as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
          currentStepIndex: execution.currentStepIndex,
          completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
          error: execution.error ?? null,
        },
      })
    } catch (err) {
      console.error(`[workflow-handler] engine falló para workflow ${wfRow.id} en ${name}`, err)
      await prisma.workflowRun
        .update({
          where: { id: placeholderId },
          data: {
            status: 'FAILED',
            error: err instanceof Error ? err.message : String(err),
            completedAt: new Date(),
          },
        })
        .catch(() => null)
    }
  }
}
