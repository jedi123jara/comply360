import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

function calcDesnaturalizacionRisk(flags: {
  hasFixedSchedule?: boolean
  hasExclusivity?: boolean
  worksOnPremises?: boolean
  usesCompanyTools?: boolean
  reportsToSupervisor?: boolean
  receivesOrders?: boolean
}): number {
  let score = 0
  if (flags.hasFixedSchedule) score += 25
  if (flags.reportsToSupervisor) score += 20
  if (flags.receivesOrders) score += 20
  if (flags.hasExclusivity) score += 15
  if (flags.usesCompanyTools) score += 10
  if (flags.worksOnPremises) score += 10
  return Math.min(score, 100)
}

// =============================================
// GET /api/prestadores/[id]
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    include: {
      rhInvoices: {
        orderBy: { issueDate: 'desc' },
        take: 24, // ultimos 2 anios
      },
    },
  })

  if (!provider || provider.orgId !== orgId) {
    return NextResponse.json({ error: 'Prestador no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      ...provider,
      monthlyAmount: Number(provider.monthlyAmount),
      startDate: provider.startDate.toISOString(),
      endDate: provider.endDate?.toISOString() ?? null,
      suspensionExpiryDate: provider.suspensionExpiryDate?.toISOString() ?? null,
      createdAt: provider.createdAt.toISOString(),
      updatedAt: provider.updatedAt.toISOString(),
      rhInvoices: provider.rhInvoices.map(inv => ({
        ...inv,
        grossAmount: Number(inv.grossAmount),
        retention: Number(inv.retention),
        netAmount: Number(inv.netAmount),
        issueDate: inv.issueDate.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      })),
    },
  })
})

// =============================================
// PUT /api/prestadores/[id]
// =============================================
export const PUT = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId
  const body = await req.json()

  const existing = await prisma.serviceProvider.findUnique({ where: { id } })
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: 'Prestador no encontrado' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}
  const stringFields = [
    'documentType', 'documentNumber', 'ruc', 'firstName', 'lastName',
    'email', 'phone', 'address', 'profession', 'servicioDescripcion',
    'area', 'currency', 'paymentFrequency', 'notes', 'contractFileUrl',
  ]
  for (const f of stringFields) {
    if (f in body) updateData[f] = body[f] || null
  }

  if ('status' in body) updateData.status = body.status
  if ('monthlyAmount' in body) updateData.monthlyAmount = Number(body.monthlyAmount)
  if ('startDate' in body) updateData.startDate = new Date(body.startDate)
  if ('endDate' in body) updateData.endDate = body.endDate ? new Date(body.endDate) : null
  if ('suspensionExpiryDate' in body) {
    updateData.suspensionExpiryDate = body.suspensionExpiryDate ? new Date(body.suspensionExpiryDate) : null
  }

  const boolFields = [
    'hasSuspensionRetencion', 'hasFixedSchedule', 'hasExclusivity',
    'worksOnPremises', 'usesCompanyTools', 'reportsToSupervisor', 'receivesOrders',
  ]
  for (const f of boolFields) {
    if (f in body) updateData[f] = Boolean(body[f])
  }

  // Recalcular riesgo si algun flag cambio
  const anyFlagChanged = boolFields.slice(1).some(f => f in body)
  if (anyFlagChanged) {
    updateData.desnaturalizacionRisk = calcDesnaturalizacionRisk({
      hasFixedSchedule: ('hasFixedSchedule' in body ? body.hasFixedSchedule : existing.hasFixedSchedule) as boolean,
      hasExclusivity: ('hasExclusivity' in body ? body.hasExclusivity : existing.hasExclusivity) as boolean,
      worksOnPremises: ('worksOnPremises' in body ? body.worksOnPremises : existing.worksOnPremises) as boolean,
      usesCompanyTools: ('usesCompanyTools' in body ? body.usesCompanyTools : existing.usesCompanyTools) as boolean,
      reportsToSupervisor: ('reportsToSupervisor' in body ? body.reportsToSupervisor : existing.reportsToSupervisor) as boolean,
      receivesOrders: ('receivesOrders' in body ? body.receivesOrders : existing.receivesOrders) as boolean,
    })
    // Auto-marcar AT_RISK si pasa el umbral y no tiene status manual
    if (!('status' in body) && (updateData.desnaturalizacionRisk as number) >= 60) {
      updateData.status = 'AT_RISK'
    }
  }

  const provider = await prisma.serviceProvider.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({
    data: {
      ...provider,
      monthlyAmount: Number(provider.monthlyAmount),
    },
  })
})

// =============================================
// DELETE /api/prestadores/[id] — soft delete
// =============================================
export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  const existing = await prisma.serviceProvider.findUnique({ where: { id } })
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: 'Prestador no encontrado' }, { status: 404 })
  }

  await prisma.serviceProvider.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      endDate: existing.endDate ?? new Date(),
    },
  })

  return NextResponse.json({ success: true })
})
