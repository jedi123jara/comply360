import { NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withWorkerAuthParams<{ id: string }>(async (_req, ctx, params) => {
  // Verify the payslip belongs to this worker (defense in depth)
  const payslip = await prisma.payslip.findFirst({
    where: { id: params.id, workerId: ctx.workerId, orgId: ctx.orgId },
  })

  if (!payslip) {
    return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
  }

  if (payslip.status === 'ANULADA') {
    return NextResponse.json({ error: 'No se puede aceptar una boleta anulada' }, { status: 400 })
  }

  if (payslip.acceptedAt) {
    return NextResponse.json({ error: 'Esta boleta ya fue aceptada' }, { status: 400 })
  }

  const updated = await prisma.payslip.update({
    where: { id: payslip.id },
    data: {
      status: 'ACEPTADA',
      acceptedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'payslip.accepted',
      entityType: 'Payslip',
      entityId: updated.id,
      metadataJson: { periodo: updated.periodo },
    },
  }).catch(() => null)

  return NextResponse.json({
    id: updated.id,
    periodo: updated.periodo,
    fechaEmision: updated.fechaEmision.toISOString(),
    totalIngresos: updated.totalIngresos.toString(),
    totalDescuentos: updated.totalDescuentos.toString(),
    netoPagar: updated.netoPagar.toString(),
    status: updated.status,
    pdfUrl: updated.pdfUrl,
    acceptedAt: updated.acceptedAt?.toISOString() || null,
  })
})
