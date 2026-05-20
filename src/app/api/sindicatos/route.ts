/**
 * /api/sindicatos — CRUD sindicatos + afiliaciones + convenios colectivos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGate('diagnostico', async (_req: NextRequest, ctx: AuthContext) => {
  const sindicatos = await prisma.sindicato.findMany({
    where: { orgId: ctx.orgId },
    include: {
      afiliaciones: { include: { worker: { select: { id: true, firstName: true, lastName: true } } } },
      convenios: true,
    },
  })
  return NextResponse.json({ sindicatos })
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { nombre, fechaConstitucion, registroMtpe, presidente, numeroAfiliados } = body as {
      nombre: string
      fechaConstitucion: string
      registroMtpe?: string
      presidente?: string
      numeroAfiliados?: number
    }
    if (!nombre || !fechaConstitucion) {
      return NextResponse.json({ error: 'nombre y fechaConstitucion requeridos' }, { status: 400 })
    }
    const created = await prisma.sindicato.create({
      data: {
        orgId: ctx.orgId,
        nombre,
        fechaConstitucion: new Date(fechaConstitucion),
        registroMtpe: registroMtpe ?? null,
        presidente: presidente ?? null,
        numeroAfiliados: numeroAfiliados ?? 0,
      },
    })
    return NextResponse.json({ sindicato: created }, { status: 201 })
  } catch (err) {
    console.error('[sindicatos POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})
