/**
 * PATCH  /api/prestadores/[id]/recibos/[invoiceId]  — Actualizar recibo (marcar pagado, etc.)
 * DELETE /api/prestadores/[id]/recibos/[invoiceId]  — Eliminar recibo
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const PATCH = withAuthParams<{ id: string; invoiceId: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: providerId, invoiceId } = params

    const invoice = await prisma.rhInvoice.findFirst({
      where: {
        id: invoiceId,
        providerId,
        orgId: ctx.orgId,
      },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })
    }

    const body = await req.json() as {
      status?: 'PENDING' | 'PAID' | 'CANCELLED'
      paidAt?: string | null
      notes?: string | null
    }

    const data: Record<string, unknown> = {}

    if (body.status !== undefined) {
      data.status = body.status
      // Auto-set paidAt when marking as PAID
      if (body.status === 'PAID' && !body.paidAt) {
        data.paidAt = new Date()
      } else if (body.status === 'PENDING') {
        data.paidAt = null
      }
    }

    if (body.paidAt !== undefined) {
      data.paidAt = body.paidAt ? new Date(body.paidAt) : null
    }

    if (body.notes !== undefined) {
      data.notes = body.notes
    }

    const updated = await prisma.rhInvoice.update({
      where: { id: invoiceId },
      data,
    })

    return NextResponse.json(updated)
  },
)

export const DELETE = withAuthParams<{ id: string; invoiceId: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: providerId, invoiceId } = params

    const invoice = await prisma.rhInvoice.findFirst({
      where: {
        id: invoiceId,
        providerId,
        orgId: ctx.orgId,
      },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 })
    }

    await prisma.rhInvoice.delete({ where: { id: invoiceId } })
    return NextResponse.json({ ok: true })
  },
)
