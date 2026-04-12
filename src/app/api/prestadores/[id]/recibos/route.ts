/**
 * GET  /api/prestadores/[id]/recibos  — Lista de recibos por honorarios del prestador
 * POST /api/prestadores/[id]/recibos  — Registrar nuevo recibo
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const GET = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: providerId } = params

    const provider = await prisma.serviceProvider.findFirst({
      where: { id: providerId, orgId: ctx.orgId },
      select: { id: true, firstName: true, lastName: true, hasSuspensionRetencion: true },
    })
    if (!provider) {
      return NextResponse.json({ error: 'Prestador no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const periodo = searchParams.get('periodo') ?? ''

    const where: Record<string, unknown> = { providerId, orgId: ctx.orgId }
    if (periodo) where.periodo = periodo

    const invoices = await prisma.rhInvoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
    })

    const totals = {
      count: invoices.length,
      grossTotal: invoices.reduce((s, i) => s + Number(i.grossAmount), 0),
      retentionTotal: invoices.reduce((s, i) => s + Number(i.retention), 0),
      netTotal: invoices.reduce((s, i) => s + Number(i.netAmount), 0),
      pending: invoices.filter(i => i.status === 'PENDING').length,
      paid: invoices.filter(i => i.status === 'PAID').length,
    }

    return NextResponse.json({ provider, invoices, totals })
  },
)

export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: providerId } = params

    const provider = await prisma.serviceProvider.findFirst({
      where: { id: providerId, orgId: ctx.orgId },
      select: {
        id: true,
        hasSuspensionRetencion: true,
        suspensionExpiryDate: true,
        monthlyAmount: true,
      },
    })
    if (!provider) {
      return NextResponse.json({ error: 'Prestador no encontrado' }, { status: 404 })
    }

    const body = await req.json() as {
      invoiceNumber: string
      issueDate: string
      periodo: string
      grossAmount: number
      notes?: string
    }

    const { invoiceNumber, issueDate, periodo, grossAmount, notes } = body

    if (!invoiceNumber || !issueDate || !periodo || !grossAmount) {
      return NextResponse.json(
        { error: 'invoiceNumber, issueDate, periodo y grossAmount son requeridos' },
        { status: 400 },
      )
    }

    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return NextResponse.json(
        { error: 'periodo debe estar en formato YYYY-MM' },
        { status: 400 },
      )
    }

    // Check if provider has active suspension of retention
    const hasSuspension =
      provider.hasSuspensionRetencion &&
      (!provider.suspensionExpiryDate || provider.suspensionExpiryDate > new Date())

    // 4ta categoría: 8% retention when amount > S/ 1,500 and no suspension
    const THRESHOLD = 1500
    const RATE = 0.08
    const shouldRetain = grossAmount > THRESHOLD && !hasSuspension
    const retention = shouldRetain ? Math.round(grossAmount * RATE * 100) / 100 : 0
    const netAmount = Math.round((grossAmount - retention) * 100) / 100

    const invoice = await prisma.rhInvoice.create({
      data: {
        orgId: ctx.orgId,
        providerId,
        invoiceNumber,
        issueDate: new Date(issueDate),
        periodo,
        grossAmount,
        retention,
        netAmount,
        hasRetention: shouldRetain,
        status: 'PENDING',
        notes: notes || null,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  },
)
