/**
 * GET /api/calendar/export.ics
 *
 * Devuelve un feed iCal (RFC-5545) con todos los eventos de compliance
 * de la org, suscribible desde Google Calendar / Outlook / Apple Calendar.
 *
 * Auth: MEMBER+ (cualquier rol del dashboard).
 *
 * URL para suscripción:
 *   webcal://comply360.pe/api/calendar/export.ics?token=xxx
 *
 * Para que funcione la sincronización automática debe ser una URL
 * persistente. Por ahora se autentica via Clerk session — para sync real
 * desde Google Calendar (que NO manda cookies Clerk) se necesita un
 * token en query string. Implementación inicial: requiere auth Clerk
 * para download manual (botón "Descargar .ics") y luego se importa
 * al calendario una sola vez.
 *
 * Sprint 9+: agregar endpoint público con token UUID por org para
 * suscripción persistente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildICalFeed, type ICalEvent } from '@/lib/calendar/ical-builder'
import {
  getWorkerAnniversaries,
  getProbationEndDates,
  getScheduledVacations,
  getAckDeadlines,
  getScheduledCapacitaciones,
} from '@/lib/calendar/extended-sources'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

  // Cargar nombre de org
  const org = await prisma.organization
    .findUnique({
      where: { id: ctx.orgId },
      select: { name: true, razonSocial: true },
    })
    .catch(() => null)
  const orgName = org?.razonSocial ?? org?.name ?? 'Tu empresa'

  // Eventos legales fijos del año (CTS, gratificación, PLAME, etc.)
  const fixedLegal: ICalEvent[] = [
    { id: `cts-may-${year}`, title: 'Depósito CTS', date: `${year}-05-15`, category: 'CTS', priority: 'critical' },
    { id: `cts-nov-${year}`, title: 'Depósito CTS', date: `${year}-11-15`, category: 'CTS', priority: 'critical' },
    { id: `grat-jul-${year}`, title: 'Pago Gratificación Fiestas Patrias', date: `${year}-07-15`, category: 'Gratificación', priority: 'critical' },
    { id: `grat-dic-${year}`, title: 'Pago Gratificación Navidad', date: `${year}-12-15`, category: 'Gratificación', priority: 'critical' },
    { id: `sst-plan-${year}`, title: 'Aprobar Plan Anual SST', date: `${year}-01-31`, category: 'SST', priority: 'high' },
    { id: `dj-mar-${year}`, title: 'Declaración Jurada Anual', date: `${year}-03-31`, category: 'Legal', priority: 'high' },
    { id: `dia-sst-${year}`, title: 'Día Mundial SST', date: `${year}-04-28`, category: 'SST', priority: 'medium' },
    { id: `igualdad-${year}`, title: 'Revisar Cuadro de Categorías (Igualdad Salarial)', date: `${year}-06-30`, category: 'Legal', priority: 'medium' },
  ]

  // PLAME mensual
  for (let m = 1; m <= 12; m++) {
    fixedLegal.push({
      id: `plame-${year}-${String(m).padStart(2, '0')}`,
      title: 'Declaración PLAME',
      date: `${year}-${String(m).padStart(2, '0')}-17`,
      category: 'Planilla',
      priority: 'high',
    })
  }

  // Cargar eventos dinámicos de la org en paralelo
  const [anniversaries, probationEnds, vacations, ackDeadlines, capacitaciones] = await Promise.all([
    getWorkerAnniversaries(ctx.orgId, year),
    getProbationEndDates(ctx.orgId),
    getScheduledVacations(ctx.orgId),
    getAckDeadlines(ctx.orgId),
    getScheduledCapacitaciones(ctx.orgId),
  ])

  // Convertir todos a shape ICalEvent
  const dynamicEvents: ICalEvent[] = [
    ...anniversaries,
    ...probationEnds,
    ...vacations,
    ...ackDeadlines,
    ...capacitaciones,
  ].map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    description: e.description,
    category: e.type,
    priority: e.priority,
    url: e.entityHref ? `${APP_URL}${e.entityHref}` : undefined,
  }))

  const allEvents = [...fixedLegal, ...dynamicEvents]

  const ics = buildICalFeed({
    calendarName: `Comply360 — ${orgName}`,
    events: allEvents,
    refreshTtlSec: 3600, // 1h
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="comply360-${year}.ics"`,
      'Cache-Control': 'public, max-age=600',
    },
  })
})
