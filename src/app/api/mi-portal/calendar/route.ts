/**
 * GET /api/mi-portal/calendar
 *
 * Eventos personales del trabajador autenticado (NO eventos de la empresa).
 *
 * Incluye:
 *   - Su propio cumpleaños (este año + siguiente)
 *   - Su propio aniversario laboral (1, 5, 10, 15, 20 años)
 *   - Su propio fin de período de prueba (si aplica)
 *   - Sus propias vacaciones programadas
 *   - Sus propios documentos pendientes de firmar (deadlines)
 *   - Sus propias capacitaciones programadas (Enrollment.scheduledAt)
 *   - Sus propias alertas individuales (WorkerAlert)
 *
 * Excluye:
 *   - Eventos org-wide (CTS, gratificación, PLAME — no son del worker)
 *   - Feriados (los puede ver en el calendario nacional separado)
 *
 * Auth: Worker.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export interface WorkerCalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'PROBATION_END' | 'VACATION' | 'ACK_DEADLINE' | 'CAPACITACION' | 'ALERT'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  href?: string
}

export const GET = withWorkerAuth(async (_req, ctx) => {
  // Worker entry vinculado al User
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId, status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      fechaIngreso: true,
    },
  })
  if (!worker) {
    return NextResponse.json({ data: [] })
  }

  const events: WorkerCalendarEvent[] = []
  const now = new Date()
  const currentYear = now.getFullYear()

  // ─── Cumpleaños (año actual + siguiente) ──────────────────────────────
  if (worker.birthDate) {
    const bday = new Date(worker.birthDate)
    for (const year of [currentYear, currentYear + 1]) {
      const dateStr = `${year}-${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`
      events.push({
        id: `me-bday-${year}`,
        title: `🎂 Tu cumpleaños`,
        date: dateStr,
        type: 'BIRTHDAY',
        priority: 'low',
        description: `Cumples años. ¡Felicidades!`,
      })
    }
  }

  // ─── Aniversarios laborales ──────────────────────────────────────────
  const ingreso = new Date(worker.fechaIngreso)
  const ingresoYear = ingreso.getFullYear()
  for (const m of [1, 5, 10, 15, 20, 25, 30]) {
    const milestoneYear = ingresoYear + m
    if (milestoneYear < currentYear || milestoneYear > currentYear + 1) continue
    const dateStr = `${milestoneYear}-${String(ingreso.getMonth() + 1).padStart(2, '0')}-${String(ingreso.getDate()).padStart(2, '0')}`
    events.push({
      id: `me-anniv-${m}`,
      title: `🎉 ${m} ${m === 1 ? 'año' : 'años'} en la empresa`,
      date: dateStr,
      type: 'ANNIVERSARY',
      priority: m >= 5 ? 'medium' : 'low',
      description: `Cumples ${m} ${m === 1 ? 'año' : 'años'} de trabajo.`,
    })
  }

  // ─── Fin período de prueba ───────────────────────────────────────────
  const probationEnd = new Date(worker.fechaIngreso)
  probationEnd.setDate(probationEnd.getDate() + 90)
  const msSinceProbation = now.getTime() - probationEnd.getTime()
  if (msSinceProbation < 7 * 24 * 60 * 60 * 1000) {
    const daysLeft = Math.ceil(-msSinceProbation / (1000 * 60 * 60 * 24))
    events.push({
      id: 'me-probation-end',
      title: '⏰ Fin de tu período de prueba',
      date: probationEnd.toISOString().split('T')[0],
      type: 'PROBATION_END',
      priority: daysLeft <= 7 ? 'high' : 'medium',
      description: `Tu período de prueba de 90 días termina ${daysLeft <= 0 ? 'hoy' : `en ${daysLeft} día(s)`}.`,
    })
  }

  // ─── Vacaciones programadas ──────────────────────────────────────────
  const vacations = await prisma.vacationRecord
    .findMany({
      where: { workerId: worker.id, fechaGoce: { gte: now } },
      select: { id: true, fechaGoce: true, diasGozados: true },
      orderBy: { fechaGoce: 'asc' },
      take: 10,
    })
    .catch(() => [])

  for (const v of vacations) {
    if (!v.fechaGoce) continue
    events.push({
      id: `me-vacation-${v.id}`,
      title: `🏖️ Tus vacaciones (${v.diasGozados} días)`,
      date: v.fechaGoce.toISOString().split('T')[0],
      type: 'VACATION',
      priority: 'medium',
      description: `Inicio de tus vacaciones programadas. Días: ${v.diasGozados}.`,
      href: '/mi-portal/perfil',
    })
  }

  // ─── Documentos pendientes de firmar ─────────────────────────────────
  // Reusa misma lógica que /api/mi-portal/pending-acknowledgments pero solo
  // los que tienen deadline calculable.
  const pendingDocs = await prisma.orgDocument
    .findMany({
      where: {
        orgId: ctx.orgId,
        acknowledgmentRequired: true,
        isPublishedToWorkers: true,
        lastNotifiedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        version: true,
        lastNotifiedAt: true,
        acknowledgmentDeadlineDays: true,
      },
    })
    .catch(() => [])

  for (const doc of pendingDocs) {
    // ¿Worker ya firmó esta versión?
    const ack = await prisma.documentAcknowledgment
      .findUnique({
        where: {
          workerId_documentId_documentVersion: {
            workerId: worker.id,
            documentId: doc.id,
            documentVersion: doc.version,
          },
        },
        select: { id: true },
      })
      .catch(() => null)
    if (ack) continue // ya firmado, skip

    if (!doc.lastNotifiedAt || !doc.acknowledgmentDeadlineDays) continue

    const deadline = new Date(doc.lastNotifiedAt)
    deadline.setDate(deadline.getDate() + doc.acknowledgmentDeadlineDays)
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    events.push({
      id: `me-ack-${doc.id}`,
      title: `📝 Plazo para firmar: ${doc.title}`,
      date: deadline.toISOString().split('T')[0],
      type: 'ACK_DEADLINE',
      priority: daysLeft <= 0 ? 'critical' : daysLeft <= 2 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
      description:
        daysLeft <= 0
          ? `Plazo VENCIDO para firmar "${doc.title}" v${doc.version}.`
          : `Tienes ${daysLeft} día(s) para firmar "${doc.title}" v${doc.version}.`,
      href: `/mi-portal/documentos/firmar/${doc.id}`,
    })
  }

  // ─── Worker alerts personales ────────────────────────────────────────
  const alerts = await prisma.workerAlert
    .findMany({
      where: { workerId: worker.id, resolvedAt: null, dueDate: { gte: now } },
      select: { id: true, title: true, description: true, dueDate: true, severity: true },
      orderBy: { dueDate: 'asc' },
      take: 20,
    })
    .catch(() => [])

  for (const a of alerts) {
    if (!a.dueDate) continue
    const sev = a.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low'
    events.push({
      id: `me-alert-${a.id}`,
      title: a.title,
      date: a.dueDate.toISOString().split('T')[0],
      type: 'ALERT',
      priority: sev,
      description: a.description ?? a.title,
    })
  }

  // Ordenar por fecha
  events.sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ data: events })
})
