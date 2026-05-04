import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  getWorkerAnniversaries,
  getProbationEndDates,
  getScheduledVacations,
  getAckDeadlines,
  getScheduledCapacitaciones,
} from '@/lib/calendar/extended-sources'
import { getAllSstPremiumEvents } from '@/lib/sst/calendar-events'

// =============================================
// Types
// =============================================

type EventType =
  | 'LEGAL'
  | 'CONTRACT'
  | 'SST'
  | 'BIRTHDAY'
  | 'ALERT'
  // Idea 2 Sprint 9 — fuentes nuevas
  | 'WORKER_ANNIVERSARY'
  | 'PROBATION_END'
  | 'VACATION'
  | 'ACK_DEADLINE'
  | 'CAPACITACION'

type EventPriority = 'critical' | 'high' | 'medium' | 'low'

interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: EventType
  priority: EventPriority
  description: string
}

// =============================================
// Fixed legal dates for a given year
// =============================================

function getFixedLegalEvents(year: number): CalendarEvent[] {
  return [
    // --- CTS Deposits (D.S. 001-97-TR) ---
    {
      id: `legal-cts-may-${year}`,
      title: 'Deposito CTS - Mayo',
      date: `${year}-05-15`,
      type: 'LEGAL',
      priority: 'critical',
      description: 'Fecha limite para deposito de CTS del semestre nov-abr (D.S. 001-97-TR). Multa SUNAFIL por incumplimiento.',
    },
    {
      id: `legal-cts-nov-${year}`,
      title: 'Deposito CTS - Noviembre',
      date: `${year}-11-15`,
      type: 'LEGAL',
      priority: 'critical',
      description: 'Fecha limite para deposito de CTS del semestre may-oct (D.S. 001-97-TR). Multa SUNAFIL por incumplimiento.',
    },
    // --- Gratificaciones (Ley 27735) ---
    {
      id: `legal-grat-jul-${year}`,
      title: 'Gratificacion Fiestas Patrias',
      date: `${year}-07-15`,
      type: 'LEGAL',
      priority: 'critical',
      description: 'Pago de gratificacion de julio + 9% bonificacion extraordinaria (Ley 27735).',
    },
    {
      id: `legal-grat-dic-${year}`,
      title: 'Gratificacion Navidad',
      date: `${year}-12-15`,
      type: 'LEGAL',
      priority: 'critical',
      description: 'Pago de gratificacion de diciembre + 9% bonificacion extraordinaria (Ley 27735).',
    },
    // --- Plan Anual SST (Ley 29783) ---
    {
      id: `legal-plan-sst-${year}`,
      title: 'Aprobacion Plan Anual SST',
      date: `${year}-01-31`,
      type: 'LEGAL',
      priority: 'high',
      description: 'Fecha limite para aprobar el Plan Anual de SST del periodo (Ley 29783, Art. 32). Requisito para inspecciones SUNAFIL.',
    },
    // --- Declaracion Jurada de Trabajadores ---
    {
      id: `legal-dj-mar-${year}`,
      title: 'Declaracion Jurada Anual',
      date: `${year}-03-31`,
      type: 'LEGAL',
      priority: 'high',
      description: 'Fecha limite para la Declaracion Jurada de Empleadores sobre informacion laboral (R.M. 107-2014-TR).',
    },
    // --- Utilidades (D.Leg. 892) ---
    {
      id: `legal-utilidades-${year}`,
      title: 'Pago de Utilidades',
      date: `${year}-04-15`,
      type: 'LEGAL',
      priority: 'critical',
      description: 'Plazo maximo para distribucion de utilidades (30 dias despues de vencimiento de DJ Renta). D.Leg. 892.',
    },
    // --- AFP/ONP Monthly (approximate, varies by RUC) ---
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `legal-afp-${year}-${String(i + 1).padStart(2, '0')}`,
      title: 'Pago AFP/ONP',
      date: `${year}-${String(i + 1).padStart(2, '0')}-05`,
      type: 'LEGAL' as EventType,
      priority: 'high' as EventPriority,
      description: `Fecha referencial para pago de aportes previsionales del mes ${i + 1}. Verificar cronograma segun ultimo digito de RUC.`,
    })),
    // --- PLAME/SUNAT Monthly ---
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `legal-plame-${year}-${String(i + 1).padStart(2, '0')}`,
      title: 'Declaracion PLAME',
      date: `${year}-${String(i + 1).padStart(2, '0')}-17`,
      type: 'LEGAL' as EventType,
      priority: 'high' as EventPriority,
      description: `Declaracion y pago PLAME/PDT 601 del mes ${i + 1}. Verificar cronograma SUNAT segun RUC.`,
    })),
    // --- Dia Mundial SST ---
    {
      id: `legal-dia-sst-${year}`,
      title: 'Dia Mundial SST',
      date: `${year}-04-28`,
      type: 'LEGAL',
      priority: 'medium',
      description: 'Dia Mundial de la Seguridad y Salud en el Trabajo. Actividad obligatoria de sensibilizacion (Ley 29783).',
    },
    // --- Dia del Trabajo ---
    {
      id: `legal-dia-trabajo-${year}`,
      title: 'Dia del Trabajo',
      date: `${year}-05-01`,
      type: 'LEGAL',
      priority: 'low',
      description: 'Feriado nacional. Descanso remunerado obligatorio. Pago triple si se labora.',
    },
    // --- Igualdad Salarial (Ley 30709) ---
    {
      id: `legal-igualdad-${year}`,
      title: 'Revision Cuadro de Categorias',
      date: `${year}-06-30`,
      type: 'LEGAL',
      priority: 'medium',
      description: 'Revision semestral del cuadro de categorias y funciones para cumplimiento de igualdad salarial (Ley 30709).',
    },
  ]
}

// =============================================
// Dynamic events from database
// =============================================

async function getExpiringContracts(orgId: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const contracts = await prisma.contract.findMany({
    where: {
      orgId,
      status: { in: ['APPROVED', 'SIGNED'] },
      expiresAt: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    select: {
      id: true,
      title: true,
      expiresAt: true,
      type: true,
    },
    orderBy: { expiresAt: 'asc' },
  })

  return contracts
    .filter((c): c is typeof c & { expiresAt: Date } => c.expiresAt !== null)
    .map((c) => {
      const daysLeft = Math.ceil(
        (c.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: `contract-exp-${c.id}`,
        title: `Contrato por vencer: ${c.title}`,
        date: c.expiresAt.toISOString().split('T')[0],
        type: 'CONTRACT',
        priority: daysLeft <= 7 ? 'critical' : daysLeft <= 15 ? 'high' : 'medium',
        description: `El contrato "${c.title}" (${c.type.replace(/_/g, ' ')}) vence en ${daysLeft} dia(s). Renovar o gestionar cese.`,
      }
    })
}

async function getOverdueSstRecords(orgId: string): Promise<CalendarEvent[]> {
  const now = new Date()

  const records = await prisma.sstRecord.findMany({
    where: {
      orgId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
      dueDate: { lte: now },
    },
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
      status: true,
    },
    orderBy: { dueDate: 'asc' },
    take: 50,
  })

  return records
    .filter((r): r is typeof r & { dueDate: Date } => r.dueDate !== null)
    .map((r) => ({
      id: `sst-overdue-${r.id}`,
      title: `SST vencido: ${r.title}`,
      date: r.dueDate.toISOString().split('T')[0],
      type: 'SST',
      priority: 'critical',
      description: `Registro SST "${r.title}" (${r.type.replace(/_/g, ' ')}) esta vencido. Estado: ${r.status}. Accion inmediata requerida.`,
    }))
}

async function getUpcomingSstRecords(orgId: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const sixtyDaysFromNow = new Date()
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)

  const records = await prisma.sstRecord.findMany({
    where: {
      orgId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: {
        gt: now,
        lte: sixtyDaysFromNow,
      },
    },
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
    },
    orderBy: { dueDate: 'asc' },
    take: 50,
  })

  return records
    .filter((r): r is typeof r & { dueDate: Date } => r.dueDate !== null)
    .map((r) => {
      const daysLeft = Math.ceil(
        (r.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: `sst-upcoming-${r.id}`,
        title: `SST: ${r.title}`,
        date: r.dueDate.toISOString().split('T')[0],
        type: 'SST',
        priority: daysLeft <= 7 ? 'high' : 'medium',
        description: `Registro SST "${r.title}" (${r.type.replace(/_/g, ' ')}) vence en ${daysLeft} dia(s).`,
      }
    })
}

async function getWorkerBirthdays(orgId: string, year: number, month: number): Promise<CalendarEvent[]> {
  // Prisma doesn't have a native EXTRACT(MONTH FROM ...) for filtering,
  // so we fetch all active workers with a birthDate and filter in JS.
  // For large orgs this could be optimized with a raw query.
  const workers = await prisma.worker.findMany({
    where: {
      orgId,
      status: 'ACTIVE',
      birthDate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
    },
  })

  return workers
    .filter((w): w is typeof w & { birthDate: Date } => {
      if (!w.birthDate) return false
      return w.birthDate.getMonth() === month
    })
    .map((w) => {
      const bDay = w.birthDate.getDate()
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(bDay).padStart(2, '0')}`
      return {
        id: `birthday-${w.id}`,
        title: `Cumpleanos: ${w.firstName} ${w.lastName}`,
        date: dateStr,
        type: 'BIRTHDAY',
        priority: 'low',
        description: `Cumpleanos de ${w.firstName} ${w.lastName}.`,
      }
    })
}

async function getActiveWorkerAlerts(orgId: string): Promise<CalendarEvent[]> {
  const alerts = await prisma.workerAlert.findMany({
    where: {
      orgId,
      resolvedAt: null,
      dueDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      type: true,
      severity: true,
      description: true,
      dueDate: true,
      worker: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  })

  return alerts
    .filter((a): a is typeof a & { dueDate: Date } => a.dueDate !== null)
    .map((a) => ({
      id: `alert-${a.id}`,
      title: `${a.title} - ${a.worker.firstName} ${a.worker.lastName}`,
      date: a.dueDate.toISOString().split('T')[0],
      type: 'ALERT',
      priority: a.severity.toLowerCase() as EventPriority,
      description: a.description || `Alerta ${a.type.replace(/_/g, ' ')} para ${a.worker.firstName} ${a.worker.lastName}.`,
    }))
}

// =============================================
// GET /api/calendar
// =============================================

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month') // 0-indexed
    const typeFilter = searchParams.get('type') // LEGAL|CONTRACT|SST|BIRTHDAY|ALERT

    const now = new Date()
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()
    const month = monthParam !== null ? parseInt(monthParam) : now.getMonth()

    const orgId = ctx.orgId

    // Gather all event sources in parallel
    const [
      fixedLegal,
      expiringContracts,
      overdueSst,
      upcomingSst,
      birthdays,
      workerAlerts,
      // Idea 2 Sprint 9 — fuentes nuevas
      anniversaries,
      probationEnds,
      vacations,
      ackDeadlines,
      capacitaciones,
      // Fase 5 — SST Premium
      sstPremium,
    ] = await Promise.all([
      Promise.resolve(getFixedLegalEvents(year)),
      getExpiringContracts(orgId),
      getOverdueSstRecords(orgId),
      getUpcomingSstRecords(orgId),
      getWorkerBirthdays(orgId, year, month),
      getActiveWorkerAlerts(orgId),
      getWorkerAnniversaries(orgId, year),
      getProbationEndDates(orgId),
      getScheduledVacations(orgId),
      getAckDeadlines(orgId),
      getScheduledCapacitaciones(orgId),
      getAllSstPremiumEvents(orgId, year),
    ])

    let events: CalendarEvent[] = [
      ...fixedLegal,
      ...expiringContracts,
      ...overdueSst,
      ...upcomingSst,
      ...birthdays,
      ...workerAlerts,
      // Convertir extended → CalendarEvent (mismo shape)
      ...anniversaries.map(toCalendarEvent),
      ...probationEnds.map(toCalendarEvent),
      ...vacations.map(toCalendarEvent),
      ...ackDeadlines.map(toCalendarEvent),
      ...capacitaciones.map(toCalendarEvent),
      // SST Premium — eventos del módulo Fase 5
      ...sstPremium,
    ]

    // Apply type filter if provided
    if (typeFilter) {
      const types = typeFilter.split(',') as EventType[]
      events = events.filter((e) => types.includes(e.type))
    }

    // Sort by date, then by priority weight
    const priorityWeight: Record<EventPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }
    events.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return priorityWeight[a.priority] - priorityWeight[b.priority]
    })

    return NextResponse.json({ data: events })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Error al obtener eventos del calendario' },
      { status: 500 }
    )
  }
})

/**
 * Convierte un ExtendedCalendarEvent al shape CalendarEvent del endpoint.
 * Los nuevos campos (entityHref, workerId, workerName) se preservan en el
 * objeto pero el tipo público los expone como campos opcionales.
 */
import type { ExtendedCalendarEvent } from '@/lib/calendar/extended-sources'

function toCalendarEvent(e: ExtendedCalendarEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    type: e.type as EventType,
    priority: e.priority as EventPriority,
    description: e.description,
  }
}
