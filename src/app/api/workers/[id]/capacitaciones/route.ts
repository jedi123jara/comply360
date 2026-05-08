/**
 * GET /api/workers/[id]/capacitaciones
 *
 * Lista las inscripciones (Enrollment) del trabajador a cursos del catálogo:
 * cursos asignados, completados, certificados emitidos y pendientes.
 *
 * Devuelve también un resumen para mostrar en el header del tab.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGateParams<{ id: string }>('workers', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId } = params

    // Verificar pertenencia al org y traer datos básicos del trabajador
    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId: ctx.orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        regimenLaboral: true,
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }

    // Inscripciones del trabajador. Filtramos a las del mismo org como
    // defensa en profundidad (Enrollment.orgId).
    const enrollments = await prisma.enrollment.findMany({
      where: {
        orgId: ctx.orgId,
        workerId,
      },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            category: true,
            durationMin: true,
            isObligatory: true,
            passingScore: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    const now = new Date()
    const items = enrollments.map((e) => {
      const daysSinceCreated = Math.floor(
        (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      // "Vencida" = obligatoria, no aprobada, > 30 días desde inscripción.
      // PASSED es el único estado terminal positivo del enum EnrollmentStatus.
      const isOverdue =
        e.course.isObligatory && e.status !== 'PASSED' && daysSinceCreated > 30
      return {
        id: e.id,
        status: e.status,
        progress: e.progress,
        examScore: e.examScore,
        examAttempts: e.examAttempts,
        startedAt: e.startedAt?.toISOString() ?? null,
        completedAt: e.completedAt?.toISOString() ?? null,
        certificateId: e.certificateId,
        createdAt: e.createdAt.toISOString(),
        daysSinceCreated,
        isOverdue,
        course: e.course,
      }
    })

    const summary = {
      total: items.length,
      completed: items.filter((i) => i.status === 'PASSED').length,
      inProgress: items.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EXAM_PENDING').length,
      notStarted: items.filter((i) => i.status === 'NOT_STARTED').length,
      failed: items.filter((i) => i.status === 'FAILED').length,
      obligatoryOverdue: items.filter((i) => i.isOverdue).length,
      certificates: items.filter((i) => !!i.certificateId).length,
    }

    return NextResponse.json({ worker, items, summary })
  },
)

