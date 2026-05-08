import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

/**
 * Seguro Vida Ley - D.Leg. 688
 *
 * Obligatorio para trabajadores con 4+ anios de servicio continuos
 * con el mismo empleador. El empleador puede contratarlo antes.
 *
 * - COMPLIANT: tiene 4+ anios y essaludVida = true
 * - NON_COMPLIANT: tiene 4+ anios y essaludVida = false
 * - APPROACHING: entre 3.5 y 4 anios (aviso preventivo 6 meses)
 * - NOT_APPLICABLE: menos de 3.5 anios
 */

type SeguroVidaStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'APPROACHING' | 'NOT_APPLICABLE'

interface SeguroVidaWorker {
  id: string
  dni: string
  firstName: string
  lastName: string
  position: string | null
  department: string | null
  fechaIngreso: string
  yearsOfService: number
  hasPolicy: boolean
  status: SeguroVidaStatus
  daysUntilRequired: number | null
}

interface SeguroVidaSummary {
  totalEligible: number
  totalCompliant: number
  totalNonCompliant: number
  totalApproaching: number
  workers: SeguroVidaWorker[]
}

function calculateServiceYears(fechaIngreso: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - new Date(fechaIngreso).getTime()
  return diffMs / (1000 * 60 * 60 * 24 * 365.25)
}

function calculateDaysUntilFourYears(fechaIngreso: Date): number {
  const fourYearDate = new Date(fechaIngreso)
  fourYearDate.setFullYear(fourYearDate.getFullYear() + 4)
  const now = new Date()
  return Math.ceil((fourYearDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getSeguroVidaStatus(yearsOfService: number, hasPolicy: boolean): SeguroVidaStatus {
  if (yearsOfService >= 4) {
    return hasPolicy ? 'COMPLIANT' : 'NON_COMPLIANT'
  }
  if (yearsOfService >= 3.5) {
    return 'APPROACHING'
  }
  return 'NOT_APPLICABLE'
}

// =============================================
// GET /api/workers/seguro-vida
// List workers with Seguro Vida Ley status
// =============================================
export const GET = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const filterStatus = searchParams.get('status') // COMPLIANT, NON_COMPLIANT, APPROACHING, all
  const includeAll = searchParams.get('includeAll') === 'true'

  // Fetch all active workers with relevant fields
  const workers = await prisma.worker.findMany({
    where: {
      orgId: ctx.orgId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      dni: true,
      firstName: true,
      lastName: true,
      position: true,
      department: true,
      fechaIngreso: true,
      essaludVida: true,
    },
    orderBy: { fechaIngreso: 'asc' },
  })

  const results: SeguroVidaWorker[] = []
  let totalEligible = 0
  let totalCompliant = 0
  let totalNonCompliant = 0
  let totalApproaching = 0

  for (const w of workers) {
    const years = calculateServiceYears(w.fechaIngreso)
    const status = getSeguroVidaStatus(years, w.essaludVida)

    if (status === 'COMPLIANT') {
      totalEligible++
      totalCompliant++
    } else if (status === 'NON_COMPLIANT') {
      totalEligible++
      totalNonCompliant++
    } else if (status === 'APPROACHING') {
      totalApproaching++
    }

    // Filter: skip NOT_APPLICABLE unless explicitly including all
    if (status === 'NOT_APPLICABLE' && !includeAll) continue

    // Filter by specific status if requested
    if (filterStatus && filterStatus !== 'all' && status !== filterStatus) continue

    const daysUntilRequired = status === 'APPROACHING'
      ? calculateDaysUntilFourYears(w.fechaIngreso)
      : null

    results.push({
      id: w.id,
      dni: w.dni,
      firstName: w.firstName,
      lastName: w.lastName,
      position: w.position,
      department: w.department,
      fechaIngreso: w.fechaIngreso.toISOString(),
      yearsOfService: Math.round(years * 100) / 100,
      hasPolicy: w.essaludVida,
      status,
      daysUntilRequired,
    })
  }

  const response: SeguroVidaSummary = {
    totalEligible,
    totalCompliant,
    totalNonCompliant,
    totalApproaching,
    workers: results,
  }

  return NextResponse.json(response)
})

