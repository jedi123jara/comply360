/**
 * GET /api/mi-portal/calendar/export.ics
 *
 * Versión worker del feed iCal — solo eventos personales del worker
 * autenticado. Mismo formato que el admin pero filtrado.
 *
 * Auth: Worker.
 *
 * Reusa la lógica del endpoint /api/mi-portal/calendar para garantizar
 * 1:1 entre lo que ve en su app y lo que sincroniza a su Google Calendar.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildICalFeed, type ICalEvent } from '@/lib/calendar/ical-builder'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const worker = await prisma.worker
    .findFirst({
      where: { userId: ctx.userId, orgId: ctx.orgId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, birthDate: true, fechaIngreso: true },
    })
    .catch(() => null)

  if (!worker) {
    // Worker libre o sin vincular → calendario vacío
    const empty = buildICalFeed({ calendarName: 'Comply360 — Mi calendario', events: [] })
    return new NextResponse(empty, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mi-calendario.ics"',
      },
    })
  }

  const events: ICalEvent[] = []
  const now = new Date()
  const currentYear = now.getFullYear()

  // Cumpleaños
  if (worker.birthDate) {
    const bday = new Date(worker.birthDate)
    for (const year of [currentYear, currentYear + 1]) {
      events.push({
        id: `me-bday-${year}`,
        title: '🎂 Mi cumpleaños',
        date: `${year}-${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`,
        category: 'Personal',
        priority: 'low',
      })
    }
  }

  // Aniversarios
  const ingreso = new Date(worker.fechaIngreso)
  const ingresoYear = ingreso.getFullYear()
  for (const m of [1, 5, 10, 15, 20, 25, 30]) {
    const milestoneYear = ingresoYear + m
    if (milestoneYear < currentYear || milestoneYear > currentYear + 1) continue
    events.push({
      id: `me-anniv-${m}`,
      title: `🎉 ${m} ${m === 1 ? 'año' : 'años'} en la empresa`,
      date: `${milestoneYear}-${String(ingreso.getMonth() + 1).padStart(2, '0')}-${String(ingreso.getDate()).padStart(2, '0')}`,
      category: 'Aniversario',
      priority: 'medium',
    })
  }

  // Vacaciones
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
      id: `me-vac-${v.id}`,
      title: `🏖️ Mis vacaciones (${v.diasGozados} días)`,
      date: v.fechaGoce.toISOString().split('T')[0],
      category: 'Vacaciones',
      priority: 'medium',
      url: `${APP_URL}/mi-portal/perfil`,
    })
  }

  // Documentos pendientes con deadline
  const docs = await prisma.orgDocument
    .findMany({
      where: {
        orgId: ctx.orgId,
        acknowledgmentRequired: true,
        isPublishedToWorkers: true,
        lastNotifiedAt: { not: null },
      },
      select: { id: true, title: true, version: true, lastNotifiedAt: true, acknowledgmentDeadlineDays: true },
    })
    .catch(() => [])

  for (const doc of docs) {
    if (!doc.lastNotifiedAt || !doc.acknowledgmentDeadlineDays) continue
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
    if (ack) continue

    const deadline = new Date(doc.lastNotifiedAt)
    deadline.setDate(deadline.getDate() + doc.acknowledgmentDeadlineDays)

    events.push({
      id: `me-ack-${doc.id}`,
      title: `📝 Plazo firma: ${doc.title}`,
      date: deadline.toISOString().split('T')[0],
      category: 'Firma',
      priority: 'high',
      url: `${APP_URL}/mi-portal/documentos/firmar/${doc.id}`,
    })
  }

  const ics = buildICalFeed({
    calendarName: `Mi calendario — ${worker.firstName} ${worker.lastName}`,
    events,
    refreshTtlSec: 3600,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="mi-calendario.ics"`,
      'Cache-Control': 'public, max-age=600',
    },
  })
})
