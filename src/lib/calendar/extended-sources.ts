/**
 * Extended event sources para Calendario Unificado (Idea 2 — Sprint 9).
 *
 * Aggregators NUEVOS que se suman a los ya existentes en /api/calendar/route.ts:
 *   - Aniversarios laborales (1, 5, 10, 15, 20 años)
 *   - Fin de período de prueba (90 días post fechaIngreso)
 *   - Vacaciones programadas (VacationRecord con fechaGoce)
 *   - Document Acknowledgment deadlines (de Idea 1!)
 *   - Capacitaciones SST programadas (SstRecord type=CAPACITACION)
 *
 * Diseño:
 *   - Todos devuelven `ExtendedCalendarEvent[]` con shape uniforme
 *   - Cada uno toma orgId + opcionalmente year (para optimizar queries)
 *   - Si una fuente falla, devuelve [] sin tirar error (defensive)
 *   - Se ejecutan en paralelo desde el endpoint con Promise.all
 */

import { prisma } from '@/lib/prisma'

export type ExtendedEventType =
  | 'WORKER_ANNIVERSARY'    // X años de trabajo
  | 'PROBATION_END'         // fin período de prueba 90d
  | 'VACATION'              // vacaciones programadas
  | 'ACK_DEADLINE'          // deadline de firma de doc
  | 'CAPACITACION'          // capacitación SST programada

export type ExtendedEventPriority = 'critical' | 'high' | 'medium' | 'low'

export interface ExtendedCalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: ExtendedEventType
  priority: ExtendedEventPriority
  description: string
  /** Si aplica, link a la entidad relacionada para CTA "Ver detalle" */
  entityHref?: string
  /** Worker afectado (si aplica) — para vista filtrada por trabajador */
  workerId?: string
  workerName?: string
}

/**
 * Aniversarios laborales — 1, 5, 10, 15, 20 años de trabajo.
 *
 * Se calculan a partir de Worker.fechaIngreso para todos los workers ACTIVE.
 * Solo se incluyen los que caen en el AÑO solicitado (parámetro year).
 *
 * Útil para: programar bonificaciones, reconocimientos, cartas de felicitación.
 */
export async function getWorkerAnniversaries(
  orgId: string,
  year: number,
): Promise<ExtendedCalendarEvent[]> {
  try {
    const workers = await prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, fechaIngreso: true },
    })

    const events: ExtendedCalendarEvent[] = []
    const milestones = [1, 5, 10, 15, 20, 25, 30]

    for (const w of workers) {
      const ingresoDate = new Date(w.fechaIngreso)
      const ingresoYear = ingresoDate.getFullYear()
      const ingresoMonth = ingresoDate.getMonth()
      const ingresoDay = ingresoDate.getDate()

      for (const m of milestones) {
        const milestoneYear = ingresoYear + m
        if (milestoneYear !== year) continue

        const dateStr = `${milestoneYear}-${String(ingresoMonth + 1).padStart(2, '0')}-${String(ingresoDay).padStart(2, '0')}`

        events.push({
          id: `anniv-${w.id}-${m}`,
          title: `🎉 ${w.firstName} ${w.lastName} cumple ${m} ${m === 1 ? 'año' : 'años'} en la empresa`,
          date: dateStr,
          type: 'WORKER_ANNIVERSARY',
          priority: m >= 5 ? 'medium' : 'low',
          description: `${w.firstName} cumple ${m} ${m === 1 ? 'año' : 'años'} de servicio en la empresa. Considera bonificación o reconocimiento (Ley 27735 – política voluntaria).`,
          entityHref: `/dashboard/trabajadores/${w.id}`,
          workerId: w.id,
          workerName: `${w.firstName} ${w.lastName}`,
        })
      }
    }

    return events
  } catch (err) {
    console.error('[calendar] anniversaries failed:', err)
    return []
  }
}

/**
 * Fin de período de prueba — 90 días después de la fechaIngreso.
 *
 * Solo workers con < 100 días en la empresa (para no acumular eventos viejos).
 * Decisión binaria importante para el admin: confirmar o cesar antes del día 90.
 */
export async function getProbationEndDates(orgId: string): Promise<ExtendedCalendarEvent[]> {
  try {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 100) // workers ingresados hace menos de 100 días

    const workers = await prisma.worker.findMany({
      where: {
        orgId,
        status: 'ACTIVE',
        fechaIngreso: { gte: cutoff },
      },
      select: { id: true, firstName: true, lastName: true, fechaIngreso: true, regimenLaboral: true },
    })

    const events: ExtendedCalendarEvent[] = []

    for (const w of workers) {
      // Período de prueba: 3 meses régimen GENERAL, 6 meses confianza, 12 meses dirección
      // Por defecto asumimos 3 meses (90 días) para GENERAL y MYPE
      const probationDays = 90
      const probationEnd = new Date(w.fechaIngreso)
      probationEnd.setDate(probationEnd.getDate() + probationDays)

      // Solo si el fin de período es futuro o reciente (últimos 7 días)
      const msSinceProbationEnd = now.getTime() - probationEnd.getTime()
      if (msSinceProbationEnd > 7 * 24 * 60 * 60 * 1000) continue

      const daysToEnd = Math.ceil(-msSinceProbationEnd / (1000 * 60 * 60 * 24))
      const dateStr = probationEnd.toISOString().split('T')[0]

      events.push({
        id: `probation-${w.id}`,
        title: `Fin período de prueba: ${w.firstName} ${w.lastName}`,
        date: dateStr,
        type: 'PROBATION_END',
        priority: daysToEnd <= 7 ? 'critical' : daysToEnd <= 15 ? 'high' : 'medium',
        description: `Período de prueba de 90 días termina en ${Math.max(0, daysToEnd)} día(s). Decide: ${daysToEnd > 0 ? 'confirmar contrato o iniciar cese' : 'el período YA pasó — el contrato se asume confirmado'}.`,
        entityHref: `/dashboard/trabajadores/${w.id}`,
        workerId: w.id,
        workerName: `${w.firstName} ${w.lastName}`,
      })
    }

    return events
  } catch (err) {
    console.error('[calendar] probation end failed:', err)
    return []
  }
}

/**
 * Vacaciones programadas — VacationRecord con fechaGoce en el futuro.
 */
export async function getScheduledVacations(orgId: string): Promise<ExtendedCalendarEvent[]> {
  try {
    const now = new Date()
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    const vacations = await prisma.vacationRecord.findMany({
      where: {
        worker: { orgId },
        fechaGoce: {
          gte: now,
          lte: oneYearFromNow,
        },
      },
      select: {
        id: true,
        fechaGoce: true,
        diasGozados: true,
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { fechaGoce: 'asc' },
    })

    return vacations
      .filter((v): v is typeof v & { fechaGoce: Date } => v.fechaGoce !== null)
      .map((v) => ({
        id: `vacation-${v.id}`,
        title: `🏖️ Vacaciones: ${v.worker.firstName} ${v.worker.lastName}`,
        date: v.fechaGoce.toISOString().split('T')[0],
        type: 'VACATION' as ExtendedEventType,
        priority: 'medium' as ExtendedEventPriority,
        description: `${v.worker.firstName} inicia vacaciones (${v.diasGozados} días). Confirmar reemplazo si aplica.`,
        entityHref: `/dashboard/vacaciones`,
        workerId: v.worker.id,
        workerName: `${v.worker.firstName} ${v.worker.lastName}`,
      }))
  } catch (err) {
    console.error('[calendar] vacations failed:', err)
    return []
  }
}

/**
 * Document Acknowledgment deadlines — de Idea 1.
 *
 * Para cada OrgDocument con acknowledgmentRequired=true Y deadline configurado
 * Y workers pendientes:
 *   deadline date = lastNotifiedAt + acknowledgmentDeadlineDays
 *
 * Se incluye solo si está dentro del año solicitado.
 */
export async function getAckDeadlines(orgId: string): Promise<ExtendedCalendarEvent[]> {
  try {
    const docs = await prisma.orgDocument.findMany({
      where: {
        orgId,
        acknowledgmentRequired: true,
        acknowledgmentDeadlineDays: { not: null },
        lastNotifiedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        type: true,
        version: true,
        lastNotifiedAt: true,
        acknowledgmentDeadlineDays: true,
      },
    })

    const events: ExtendedCalendarEvent[] = []
    const now = new Date()

    for (const doc of docs) {
      if (!doc.lastNotifiedAt || !doc.acknowledgmentDeadlineDays) continue

      const deadline = new Date(doc.lastNotifiedAt)
      deadline.setDate(deadline.getDate() + doc.acknowledgmentDeadlineDays)

      // Contar workers pendientes (que no han firmado la versión actual)
      const targetCount = await prisma.worker.count({
        where: { orgId, status: 'ACTIVE' },
      })
      const signedCount = await prisma.documentAcknowledgment.count({
        where: { orgId, documentId: doc.id, documentVersion: doc.version },
      })
      const pending = targetCount - signedCount

      if (pending <= 0) continue // todos firmaron, no es un evento relevante

      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const dateStr = deadline.toISOString().split('T')[0]

      events.push({
        id: `ack-deadline-${doc.id}`,
        title: `📝 Plazo firma: ${doc.title}`,
        date: dateStr,
        type: 'ACK_DEADLINE',
        priority: daysLeft <= 0 ? 'critical' : daysLeft <= 2 ? 'critical' : daysLeft <= 7 ? 'high' : 'medium',
        description: `${pending} trabajador(es) aún no firman "${doc.title}" v${doc.version}. ${daysLeft <= 0 ? '¡Plazo VENCIDO!' : `Faltan ${daysLeft} día(s).`}`,
        entityHref: `/dashboard/documentos-firma`,
      })
    }

    return events
  } catch (err) {
    console.error('[calendar] ack deadlines failed:', err)
    return []
  }
}

/**
 * Capacitaciones SST programadas — SstRecord type=CAPACITACION con dueDate futuro.
 */
export async function getScheduledCapacitaciones(orgId: string): Promise<ExtendedCalendarEvent[]> {
  try {
    const now = new Date()

    const records = await prisma.sstRecord.findMany({
      where: {
        orgId,
        type: 'CAPACITACION',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { gte: now },
      },
      select: { id: true, title: true, dueDate: true, description: true },
      orderBy: { dueDate: 'asc' },
      take: 50,
    })

    return records
      .filter((r): r is typeof r & { dueDate: Date } => r.dueDate !== null)
      .map((r) => {
        const daysLeft = Math.ceil((r.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: `capacitacion-${r.id}`,
          title: `🎓 Capacitación SST: ${r.title}`,
          date: r.dueDate.toISOString().split('T')[0],
          type: 'CAPACITACION' as ExtendedEventType,
          priority: (daysLeft <= 7 ? 'high' : 'medium') as ExtendedEventPriority,
          description:
            r.description ?? `Capacitación SST programada (Ley 29783, Art. 35). 4 obligatorias por año.`,
          entityHref: `/dashboard/sst`,
        }
      })
  } catch (err) {
    console.error('[calendar] capacitaciones failed:', err)
    return []
  }
}
