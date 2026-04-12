import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const boletas = await prisma.payslip.findMany({
    where: { workerId: ctx.workerId, orgId: ctx.orgId },
    orderBy: { periodo: 'desc' },
    take: 24, // ultimos 24 meses
  })

  return NextResponse.json({
    boletas: boletas.map((b) => ({
      id: b.id,
      periodo: b.periodo,
      fechaEmision: b.fechaEmision.toISOString(),
      totalIngresos: b.totalIngresos.toString(),
      totalDescuentos: b.totalDescuentos.toString(),
      netoPagar: b.netoPagar.toString(),
      status: b.status,
      pdfUrl: b.pdfUrl,
      acceptedAt: b.acceptedAt?.toISOString() || null,
    })),
  })
})
