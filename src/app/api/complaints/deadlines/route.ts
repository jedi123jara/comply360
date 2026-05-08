import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Hostigamiento Sexual — Plazos legales
// D.S. 014-2019-MIMP, Ley 27942
// =============================================
// Art. 18 — Medidas de protección:  3 días hábiles desde recepción
// Art. 20 — Investigación:         30 días calendario desde recepción
// Art. 22 — Resolución/Sanción:     5 días hábiles desde informe final

// Hábiles: Mon–Fri excluding standard holidays (simplified)
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) added++ // skip weekends
  }
  return result
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

type DeadlineStatus = 'OK' | 'EXPIRING_SOON' | 'OVERDUE'

function deadlineStatus(days: number): DeadlineStatus {
  if (days < 0) return 'OVERDUE'
  if (days <= 3) return 'EXPIRING_SOON'
  return 'OK'
}

interface Deadline {
  label: string
  baseLegal: string
  dueDate: string
  daysRemaining: number
  status: DeadlineStatus
}

interface ComplaintDeadlines {
  complaintId: string
  code: string
  type: string
  receivedAt: string
  currentStatus: string
  deadlines: Deadline[]
  isHostigamiento: boolean
  requiresDeadlineTracking: boolean
}

// =============================================
// GET /api/complaints/deadlines — Deadline tracker for hostigamiento complaints
// =============================================
export const GET = withPlanGate('denuncias', async (_req, ctx: AuthContext) => {
  const orgId = ctx.orgId

  // Only fetch hostigamiento sexual and acoso laboral complaints (Ley 27942)
  const complaints = await prisma.complaint.findMany({
    where: {
      orgId,
      type: { in: ['HOSTIGAMIENTO_SEXUAL', 'ACOSO_LABORAL', 'DISCRIMINACION'] },
      status: { notIn: ['RESOLVED', 'DISMISSED'] },
    },
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      receivedAt: true,
    },
  })

  const results: ComplaintDeadlines[] = complaints.map((c) => {
    const received = new Date(c.receivedAt)
    const isHostigamiento = c.type === 'HOSTIGAMIENTO_SEXUAL'

    const deadlines: Deadline[] = []

    if (isHostigamiento) {
      // D.S. 014-2019-MIMP deadlines for hostigamiento sexual
      const medidas = addBusinessDays(received, 3)
      const investigacion = addCalendarDays(received, 30)
      const resolucion = addBusinessDays(investigacion, 5)

      deadlines.push({
        label: 'Medidas de proteccion',
        baseLegal: 'D.S. 014-2019-MIMP, Art. 18',
        dueDate: medidas.toISOString(),
        daysRemaining: daysUntil(medidas),
        status: deadlineStatus(daysUntil(medidas)),
      })
      deadlines.push({
        label: 'Conclusion de investigacion',
        baseLegal: 'D.S. 014-2019-MIMP, Art. 20',
        dueDate: investigacion.toISOString(),
        daysRemaining: daysUntil(investigacion),
        status: deadlineStatus(daysUntil(investigacion)),
      })
      deadlines.push({
        label: 'Resolucion y sancion',
        baseLegal: 'D.S. 014-2019-MIMP, Art. 22',
        dueDate: resolucion.toISOString(),
        daysRemaining: daysUntil(resolucion),
        status: deadlineStatus(daysUntil(resolucion)),
      })
    } else {
      // General: Ley 27942 — employer must investigate within 30 days
      const investigacion = addCalendarDays(received, 30)
      deadlines.push({
        label: 'Plazo de investigacion',
        baseLegal: 'Ley 27942, Art. 31',
        dueDate: investigacion.toISOString(),
        daysRemaining: daysUntil(investigacion),
        status: deadlineStatus(daysUntil(investigacion)),
      })
    }

    return {
      complaintId: c.id,
      code: c.code,
      type: c.type,
      receivedAt: c.receivedAt.toISOString(),
      currentStatus: c.status,
      deadlines,
      isHostigamiento,
      requiresDeadlineTracking: true,
    }
  })

  // Summary stats
  const overdueCount = results.reduce((sum, r) =>
    sum + r.deadlines.filter(d => d.status === 'OVERDUE').length, 0)
  const expiringSoonCount = results.reduce((sum, r) =>
    sum + r.deadlines.filter(d => d.status === 'EXPIRING_SOON').length, 0)

  return NextResponse.json({
    data: {
      complaints: results,
      summary: {
        total: results.length,
        overdueDeadlines: overdueCount,
        expiringSoonDeadlines: expiringSoonCount,
        compliant: results.length > 0 && overdueCount === 0,
      },
      baseLegal: {
        hostigamiento: 'Ley 27942 — Ley de Prevencion y Sancion del Hostigamiento Sexual',
        reglamento: 'D.S. 014-2019-MIMP — Reglamento de la Ley 27942',
        obligacion: 'Empleadores con 20+ trabajadores deben implementar Comite de Intervencion',
      },
    },
  })
})

