import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/workers/extranjeros - Foreign worker stats (Ley 689)
// =============================================
export const GET = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  // 1. Count total active workers
  const totalWorkers = await prisma.worker.count({
    where: { orgId, status: 'ACTIVE' },
  })

  // 2. Get all foreign workers (nationality != 'peruana' and not null)
  const foreignWorkers = await prisma.worker.findMany({
    where: {
      orgId,
      status: 'ACTIVE',
      nationality: { not: 'peruana' },
      NOT: { nationality: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nationality: true,
      position: true,
      department: true,
      fechaIngreso: true,
      dni: true,
      documents: {
        where: {
          OR: [
            { documentType: { contains: 'permiso', mode: 'insensitive' } },
            { documentType: { contains: 'carnet_extranjeria', mode: 'insensitive' } },
            { documentType: { contains: 'carné', mode: 'insensitive' } },
            { documentType: { contains: 'work_permit', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          documentType: true,
          title: true,
          status: true,
          expiresAt: true,
        },
      },
    },
    orderBy: { lastName: 'asc' },
  })

  // 3. Calculate percentage
  const foreignCount = foreignWorkers.length
  const percentage = totalWorkers > 0
    ? Math.round((foreignCount / totalWorkers) * 10000) / 100
    : 0

  // 4. Legal limit per Ley 689: 20%
  const LIMIT_PERCENTAGE = 20
  const isOverLimit = percentage >= LIMIT_PERCENTAGE
  const isApproachingLimit = percentage >= 15 && percentage < LIMIT_PERCENTAGE

  // 5. Map foreign workers with permit status
  const foreignWorkersData = foreignWorkers.map((w) => {
    const hasPermit = w.documents.length > 0
    const permitExpired = w.documents.some(
      (d) => d.expiresAt && new Date(d.expiresAt) < new Date()
    )
    const permitStatus = !hasPermit
      ? 'SIN_PERMISO'
      : permitExpired
        ? 'PERMISO_VENCIDO'
        : 'VIGENTE'

    return {
      id: w.id,
      nombre: `${w.firstName} ${w.lastName}`,
      nationality: w.nationality,
      position: w.position,
      department: w.department,
      fechaIngreso: w.fechaIngreso.toISOString(),
      dni: w.dni,
      hasPermit,
      permitStatus,
      documents: w.documents.map((d) => ({
        id: d.id,
        type: d.documentType,
        title: d.title,
        status: d.status,
        expiresAt: d.expiresAt?.toISOString() || null,
      })),
    }
  })

  // 6. Count missing permits
  const sinPermiso = foreignWorkersData.filter(
    (w) => w.permitStatus === 'SIN_PERMISO'
  ).length
  const permisoVencido = foreignWorkersData.filter(
    (w) => w.permitStatus === 'PERMISO_VENCIDO'
  ).length

  return NextResponse.json({
    data: {
      totalWorkers,
      foreignCount,
      percentage,
      limitPercentage: LIMIT_PERCENTAGE,
      isOverLimit,
      isApproachingLimit,
      complianceStatus: isOverLimit
        ? 'NO_CUMPLE'
        : isApproachingLimit
          ? 'EN_RIESGO'
          : 'CUMPLE',
      sinPermiso,
      permisoVencido,
      foreignWorkers: foreignWorkersData,
      baseLegal: 'Ley 689 - Ley para la contratacion de trabajadores extranjeros',
      limitExplanation:
        'Los empleadores no pueden contratar mas del 20% de trabajadores extranjeros ' +
        'del total de su personal. Las remuneraciones de los trabajadores extranjeros ' +
        'no pueden exceder el 30% del total de la planilla.',
    },
  })
})

