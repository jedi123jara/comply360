/**
 * GET /api/honorarios?periodo=YYYY-MM
 *
 * Resumen de todos los recibos por honorarios de la org para un período,
 * agrupados por prestador. Incluye totales de retención 4ta categoría.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const GET = withPlanGate('contratos', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? ''

  // Load all active providers with their invoices
  const providers = await prisma.serviceProvider.findMany({
    where: { orgId, status: { not: 'TERMINATED' } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentNumber: true,
      ruc: true,
      profession: true,
      monthlyAmount: true,
      hasSuspensionRetencion: true,
      status: true,
      rhInvoices: {
        where: periodo ? { periodo } : {},
        orderBy: { issueDate: 'desc' },
      },
    },
  })

  const result = providers.map(p => {
    const invoices = p.rhInvoices
    const totalBruto = invoices.reduce((s, i) => s + Number(i.grossAmount), 0)
    const totalRetencion = invoices.reduce((s, i) => s + Number(i.retention), 0)
    const totalNeto = invoices.reduce((s, i) => s + Number(i.netAmount), 0)
    const pendientes = invoices.filter(i => i.status === 'PENDING').length
    const pagados = invoices.filter(i => i.status === 'PAID').length

    return {
      provider: {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        documentNumber: p.documentNumber,
        ruc: p.ruc,
        profession: p.profession ?? '',
        monthlyAmount: Number(p.monthlyAmount),
        hasSuspensionRetencion: p.hasSuspensionRetencion,
        status: p.status,
      },
      invoices: invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        issueDate: i.issueDate,
        periodo: i.periodo,
        grossAmount: Number(i.grossAmount),
        retention: Number(i.retention),
        netAmount: Number(i.netAmount),
        hasRetention: i.hasRetention,
        status: i.status,
        paidAt: i.paidAt,
        notes: i.notes,
      })),
      summary: {
        count: invoices.length,
        totalBruto,
        totalRetencion,
        totalNeto,
        pendientes,
        pagados,
      },
    }
  })

  // Org totals
  const allInvoices = result.flatMap(r => r.invoices)
  const totals = {
    totalProviders: providers.length,
    providersConRecibo: result.filter(r => r.invoices.length > 0).length,
    providersSinRecibo: result.filter(r => r.invoices.length === 0).length,
    totalRecibos: allInvoices.length,
    totalBruto: allInvoices.reduce((s, i) => s + i.grossAmount, 0),
    totalRetencion: allInvoices.reduce((s, i) => s + i.retention, 0),
    totalNeto: allInvoices.reduce((s, i) => s + i.netAmount, 0),
    pendientes: allInvoices.filter(i => i.status === 'PENDING').length,
    pagados: allInvoices.filter(i => i.status === 'PAID').length,
  }

  return NextResponse.json({ providers: result, totals, periodo })
})

