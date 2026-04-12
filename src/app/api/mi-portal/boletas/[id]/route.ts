import { NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuthParams<{ id: string }>(async (_req, ctx, params) => {
  // Defense in depth: verifica que la boleta pertenece al worker y a la org correcta
  const payslip = await prisma.payslip.findFirst({
    where: {
      id: params.id,
      workerId: ctx.workerId,
      orgId: ctx.orgId,
    },
  })

  if (!payslip) {
    return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    id: payslip.id,
    periodo: payslip.periodo,
    fechaEmision: payslip.fechaEmision.toISOString(),
    // Ingresos
    sueldoBruto: payslip.sueldoBruto.toString(),
    asignacionFamiliar: payslip.asignacionFamiliar?.toString() || null,
    horasExtras: payslip.horasExtras?.toString() || null,
    bonificaciones: payslip.bonificaciones?.toString() || null,
    totalIngresos: payslip.totalIngresos.toString(),
    // Descuentos
    aporteAfpOnp: payslip.aporteAfpOnp?.toString() || null,
    rentaQuintaCat: payslip.rentaQuintaCat?.toString() || null,
    otrosDescuentos: payslip.otrosDescuentos?.toString() || null,
    totalDescuentos: payslip.totalDescuentos.toString(),
    // Neto
    netoPagar: payslip.netoPagar.toString(),
    // Aportes empleador (solo informativo)
    essalud: payslip.essalud?.toString() || null,
    // Archivo y estado
    pdfUrl: payslip.pdfUrl,
    detalleJson: payslip.detalleJson as Record<string, unknown> | null,
    status: payslip.status,
    acceptedAt: payslip.acceptedAt?.toISOString() || null,
  })
})
