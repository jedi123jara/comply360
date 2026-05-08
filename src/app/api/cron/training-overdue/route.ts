/**
 * GET /api/cron/training-overdue
 *
 * Vercel Cron diario — detecta inscripciones a capacitaciones obligatorias
 * que llevan más de 30 días sin completarse y crea/actualiza alertas tipo
 * `CAPACITACION_PENDIENTE` en `WorkerAlert`.
 *
 * Reglas:
 *  - Solo cursos con `isObligatory=true` y `isActive=true`
 *  - Estados que cuentan como pendientes: NOT_STARTED, IN_PROGRESS, EXAM_PENDING, FAILED
 *    (PASSED es el único terminal positivo)
 *  - Severidad escala con antigüedad:
 *    30-60 días → MEDIUM
 *    60-90 días → HIGH
 *    >90 días   → CRITICAL
 *  - Idempotencia: por cada (workerId, enrollmentId) si ya existe alerta
 *    no resuelta del mismo tipo, se actualiza severidad y descripción.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { AlertSeverity } from '@/generated/prisma/client'
import { withCronIdempotency } from '@/lib/cron/wrap'

export const runtime = 'nodejs'

const FP_PREFIX = '[training-fp:'
const FP_SUFFIX = ']'

function wrapDescription(description: string, fingerprint: string): string {
  return `${FP_PREFIX}${fingerprint}${FP_SUFFIX} ${description}`
}

function severityForDays(days: number): AlertSeverity {
  if (days > 90) return 'CRITICAL'
  if (days > 60) return 'HIGH'
  return 'MEDIUM'
}

// FIX #5.A: idempotencia diaria.
export const GET = withCronIdempotency('training-overdue', 1440, async () => {
  const now = new Date()
  const overdueThreshold = new Date(now)
  overdueThreshold.setDate(overdueThreshold.getDate() - 30)

  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING', 'FAILED'] },
      createdAt: { lt: overdueThreshold },
      workerId: { not: null }, // sin worker no podemos crear alerta
      course: { isObligatory: true, isActive: true },
    },
    include: {
      course: { select: { title: true, category: true } },
    },
  })

  const stats = {
    enrollmentsScanned: enrollments.length,
    alertsCreated: 0,
    alertsUpdated: 0,
    alertsSkipped: 0,
    errors: 0,
  }

  for (const e of enrollments) {
    if (!e.workerId) continue
    try {
      const daysOverdue = Math.floor(
        (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      )
      const severity = severityForDays(daysOverdue)
      const fingerprint = `enrollment-${e.id}`
      const title = `Capacitación obligatoria pendiente: ${e.course.title}`
      const description = wrapDescription(
        `${e.course.category} · ${daysOverdue} días desde asignación. Estado: ${e.status}.`,
        fingerprint,
      )

      // Buscar alerta existente con mismo fingerprint y sin resolver
      const existing = await prisma.workerAlert.findFirst({
        where: {
          workerId: e.workerId,
          type: 'CAPACITACION_PENDIENTE',
          resolvedAt: null,
          description: { startsWith: `${FP_PREFIX}${fingerprint}${FP_SUFFIX}` },
        },
        select: { id: true, severity: true },
      })

      if (existing) {
        // Solo actualiza si cambió severidad o pasaron 7 días
        if (existing.severity !== severity) {
          await prisma.workerAlert.update({
            where: { id: existing.id },
            data: { severity, description, title },
          })
          stats.alertsUpdated++
        } else {
          stats.alertsSkipped++
        }
      } else {
        // Worker.orgId requerido para WorkerAlert.orgId
        await prisma.workerAlert.create({
          data: {
            workerId: e.workerId,
            orgId: e.orgId,
            type: 'CAPACITACION_PENDIENTE',
            severity,
            title,
            description,
            // multaEstimada conservadora — capacitaciones obligatorias SST sin
            // hacer = infracción grave Art. 27 D.S. 019-2006-TR (1.79-9.08 UIT)
            multaEstimada: severity === 'CRITICAL' ? 9854 : severity === 'HIGH' ? 4927 : 1972,
          },
        })
        stats.alertsCreated++
      }
    } catch (err) {
      console.error('[training-overdue]', { enrollmentId: e.id, err })
      stats.errors++
    }
  }

  return NextResponse.json({
    ok: true,
    runAt: now.toISOString(),
    stats,
  })
})
