/**
 * PATCH  /api/workers/[id]/vacaciones/[recordId]  — Actualizar goce o datos del período
 * DELETE /api/workers/[id]/vacaciones/[recordId]  — Eliminar registro de vacaciones
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const PATCH = withAuthParams<{ id: string; recordId: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId, recordId } = params

    // Verify ownership through the worker → org chain
    const record = await prisma.vacationRecord.findFirst({
      where: {
        id: recordId,
        workerId,
        worker: { orgId: ctx.orgId },
      },
    })
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const body = await req.json() as {
      diasGozados?: number
      fechaGoce?: string | null
      esDoble?: boolean
    }

    const { diasGozados, fechaGoce, esDoble } = body

    const newGozados =
      diasGozados !== undefined
        ? Math.min(Math.max(0, diasGozados), record.diasCorresponden)
        : record.diasGozados

    const updated = await prisma.vacationRecord.update({
      where: { id: recordId },
      data: {
        diasGozados: newGozados,
        diasPendientes: record.diasCorresponden - newGozados,
        fechaGoce:
          fechaGoce !== undefined
            ? fechaGoce
              ? new Date(fechaGoce)
              : null
            : record.fechaGoce,
        esDoble: esDoble !== undefined ? esDoble : record.esDoble,
      },
    })

    return NextResponse.json(updated)
  },
)

export const DELETE = withAuthParams<{ id: string; recordId: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const { id: workerId, recordId } = params

    const record = await prisma.vacationRecord.findFirst({
      where: {
        id: recordId,
        workerId,
        worker: { orgId: ctx.orgId },
      },
    })
    if (!record) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    await prisma.vacationRecord.delete({ where: { id: recordId } })
    return NextResponse.json({ ok: true })
  },
)
