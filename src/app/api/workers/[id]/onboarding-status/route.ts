/**
 * GET /api/workers/[id]/onboarding-status
 *
 * Devuelve el estado de la invitación al portal del trabajador:
 *   - invitationSentAt: cuándo se ejecutó la cascada por última vez (AuditLog)
 *   - workerHasLoggedIn: si el trabajador ya tiene un User asociado
 *   - workerLastLogin: última fecha de login (si aplica)
 *   - legajoCompleteness: % de legajo (0-100) — sirve para saber si subió docs
 *   - documentsRequested: # de WorkerRequest creadas para él (cascada)
 *
 * Usado por OnboardingCascadeCard para mostrar el estado correcto en lugar
 * del badge fijo "Pendiente".
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'

export const GET = withPlanGate('workers', async (_req, ctx) => {
  // Extraer workerId del path /api/workers/[id]/onboarding-status
  const url = new URL(_req.url)
  const segments = url.pathname.split('/')
  const workerId = segments[segments.indexOf('workers') + 1]

  if (!workerId) {
    return NextResponse.json({ error: 'workerId requerido' }, { status: 400 })
  }

  // Verificar que el worker pertenezca a la org del usuario
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId: ctx.orgId },
    select: {
      id: true,
      email: true,
      legajoScore: true,
      userId: true,
    },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Worker no encontrado' }, { status: 404 })
  }

  // 1. Última ejecución de cascada via AuditLog
  const lastCascade = await prisma.auditLog.findFirst({
    where: {
      orgId: ctx.orgId,
      action: 'ONBOARDING_CASCADE_EXECUTED',
      entityType: 'Worker',
      entityId: workerId,
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, metadataJson: true },
  })

  // 2. Si el worker tiene userId vinculado, asumimos que ya hizo registro
  //    (el User se crea cuando entra al portal con su email por primera vez).
  //    Como proxy de "última actividad" usamos streakLastAt (gamificación).
  let workerHasLoggedIn = false
  let workerLastLogin: Date | null = null
  if (worker.userId) {
    workerHasLoggedIn = true
    const user = await prisma.user.findUnique({
      where: { id: worker.userId },
      select: { streakLastAt: true, updatedAt: true },
    })
    workerLastLogin = user?.streakLastAt ?? user?.updatedAt ?? null
  }

  // 3. ¿Cuántas WorkerRequest se le crearon (que aún no resolvió)?
  // Enum WorkerRequestStatus está en español: PENDIENTE | EN_REVISION |
  // APROBADA | RECHAZADA | CANCELADA. Las pendientes son PENDIENTE + EN_REVISION.
  const documentsRequested = await prisma.workerRequest.count({
    where: { workerId, status: { in: ['PENDIENTE', 'EN_REVISION'] } },
  }).catch(() => 0)

  return NextResponse.json({
    workerId,
    email: worker.email,
    invitationSentAt: lastCascade?.createdAt?.toISOString() ?? null,
    workerHasLoggedIn,
    workerLastLogin: workerLastLogin?.toISOString() ?? null,
    legajoCompleteness: worker.legajoScore ?? 0,
    documentsRequested,
    // Estado calculado para el componente
    status: computeStatus({
      invitationSent: !!lastCascade,
      workerHasLoggedIn,
      legajoComplete: (worker.legajoScore ?? 0) >= 80,
      hasEmail: !!worker.email,
    }),
  })
})

type CascadeStatus =
  | 'no_email'           // Worker no tiene email — no se puede invitar
  | 'not_invited'        // Aún no se envió la invitación
  | 'invited_waiting'    // Invitación enviada, worker no entró
  | 'logged_in_pending'  // Worker entró pero legajo incompleto
  | 'completed'          // Worker entró + completó legajo

function computeStatus(opts: {
  invitationSent: boolean
  workerHasLoggedIn: boolean
  legajoComplete: boolean
  hasEmail: boolean
}): CascadeStatus {
  if (!opts.hasEmail) return 'no_email'
  if (!opts.invitationSent) return 'not_invited'
  if (!opts.workerHasLoggedIn) return 'invited_waiting'
  if (!opts.legajoComplete) return 'logged_in_pending'
  return 'completed'
}

