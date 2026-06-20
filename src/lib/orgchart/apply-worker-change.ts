/**
 * applyWorkerChange — servicio único de cambios de ciclo de vida del trabajador.
 *
 * Un cambio de puesto, una promoción, un aumento, una suspensión o un cese deben
 * propagarse SIEMPRE igual, se disparen desde el módulo de Trabajadores o desde
 * el organigrama. Esta función es ese punto único: encadena atómicamente el
 * Worker + las OrgAssignment y luego recomputa alertas, score e historial.
 *
 * La lógica de decisión vive (pura, testeable) en `apply-worker-change-plan.ts`.
 */
import { prisma } from '@/lib/prisma'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { logWorkerChanges } from '@/lib/workers/history'
import { mirrorPrimaryAssignmentToWorker } from './worker-sync'
import {
  planWorkerChange,
  type WorkerChangeInput,
  type WorkerStatusValue,
} from './apply-worker-change-plan'

export * from './apply-worker-change-plan'

export interface ApplyWorkerChangeResult {
  ok: boolean
  error?: string
  status?: number
}

class WorkerChangeError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message)
  }
}

/**
 * Ejecuta un cambio del trabajador de forma consistente y propagada.
 */
export async function applyWorkerChange(
  orgId: string,
  workerId: string,
  change: WorkerChangeInput,
  actorUserId?: string,
): Promise<ApplyWorkerChangeResult> {
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId },
    select: {
      id: true,
      status: true,
      sueldoBruto: true,
      position: true,
      department: true,
      fechaCese: true,
      motivoCese: true,
    },
  })
  if (!worker) return { ok: false, error: 'Trabajador no encontrado.', status: 404 }

  const plan = planWorkerChange(change, {
    status: worker.status as WorkerStatusValue,
    sueldoBruto: Number(worker.sueldoBruto),
  })
  if (plan.error) return { ok: false, error: plan.error, status: 409 }

  const now = new Date()
  try {
    await prisma.$transaction(async (tx) => {
      if (plan.closeAllAssignments) {
        await tx.orgAssignment.updateMany({
          where: { workerId, endedAt: null },
          data: { endedAt: now },
        })
      } else if (plan.closeActivePrimary) {
        await tx.orgAssignment.updateMany({
          where: { orgId, workerId, isPrimary: true, endedAt: null },
          data: { endedAt: now },
        })
      }

      if (plan.assignNewPositionId) {
        // Mismos invariantes que la ruta canónica de asignaciones, DENTRO de la
        // transacción y DESPUÉS de cerrar la primaria previa: existencia, cupo,
        // duplicado y capacidad total ≤ 100%.
        const pos = await tx.orgPosition.findFirst({
          where: { id: plan.assignNewPositionId, orgId },
          select: { seats: true },
        })
        if (!pos) throw new WorkerChangeError('El cargo destino no existe.', 400)

        const dup = await tx.orgAssignment.findFirst({
          where: { orgId, workerId, positionId: plan.assignNewPositionId, endedAt: null },
          select: { id: true },
        })
        if (dup) {
          throw new WorkerChangeError('El trabajador ya tiene una asignación vigente en ese cargo.')
        }

        const activeSeats = await tx.orgAssignment.count({
          where: { orgId, positionId: plan.assignNewPositionId, endedAt: null },
        })
        if (activeSeats >= pos.seats) {
          throw new WorkerChangeError('El cargo destino ya alcanzó sus cupos aprobados.')
        }

        const cap = await tx.orgAssignment.aggregate({
          where: { orgId, workerId, endedAt: null },
          _sum: { capacityPct: true },
        })
        if ((cap._sum.capacityPct ?? 0) + plan.capacityPct > 100) {
          throw new WorkerChangeError('La dedicación activa del trabajador superaría el 100%.')
        }

        await tx.orgAssignment.create({
          data: {
            orgId,
            workerId,
            positionId: plan.assignNewPositionId,
            isPrimary: true,
            isInterim: false,
            startedAt: now,
            capacityPct: plan.capacityPct,
          },
        })
      }

      if (Object.keys(plan.workerData).length > 0) {
        await tx.worker.update({ where: { id: workerId }, data: plan.workerData })
      }
    })
  } catch (err) {
    if (err instanceof WorkerChangeError) {
      return { ok: false, error: err.message, status: err.status }
    }
    throw err
  }

  // Hooks best-effort (fuera de la transacción): propagar al resto de la plataforma.
  if (plan.assignNewPositionId) {
    // mirror espeja position/department + recomputa alertas/score.
    await mirrorPrimaryAssignmentToWorker(workerId, plan.assignNewPositionId).catch((err) =>
      console.error('[applyWorkerChange] mirror falló', err),
    )
  } else if (plan.recomputeAfter) {
    try {
      await generateWorkerAlerts(workerId)
    } catch (err) {
      console.error('[applyWorkerChange] generateWorkerAlerts falló', err)
    }
    syncComplianceScore(orgId).catch(() => {})
  }

  // Historial (best-effort).
  try {
    const after = await prisma.worker.findUnique({ where: { id: workerId } })
    if (after) {
      await logWorkerChanges({
        workerId,
        orgId,
        before: worker as unknown as Record<string, unknown>,
        after: after as unknown as Record<string, unknown>,
        triggeredBy: actorUserId ?? 'system',
        reason: plan.historyReason,
      })
    }
  } catch (err) {
    console.error('[applyWorkerChange] logWorkerChanges falló', err)
  }

  return { ok: true }
}
