/**
 * /api/workers/[id]/disciplina — CRUD acciones disciplinarias por worker.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGateParams<{ id: string }>(
  'diagnostico',
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const actions = await prisma.disciplinaryAction.findMany({
      where: { orgId: ctx.orgId, workerId: params.id },
      orderBy: { fechaAccion: 'desc' },
    })
    return NextResponse.json({ actions })
  }
)

export const POST = withPlanGateParams<{ id: string }>(
  'diagnostico',
  async (req: NextRequest, ctx: AuthContext, params) => {
    try {
      const body = await req.json()
      const {
        tipo,
        fechaAccion,
        motivo,
        baseLegal,
        diasSuspension,
        descargosPlazo,
        cartaUrl,
      } = body as {
        tipo: string
        fechaAccion: string
        motivo: string
        baseLegal?: string
        diasSuspension?: number
        descargosPlazo?: string
        cartaUrl?: string
      }
      if (!tipo || !fechaAccion || !motivo) {
        return NextResponse.json({ error: 'tipo, fechaAccion y motivo requeridos' }, { status: 400 })
      }
      const created = await prisma.disciplinaryAction.create({
        data: {
          orgId: ctx.orgId,
          workerId: params.id,
          tipo,
          fechaAccion: new Date(fechaAccion),
          motivo,
          baseLegal: baseLegal ?? null,
          diasSuspension: diasSuspension ?? null,
          descargosPlazo: descargosPlazo ? new Date(descargosPlazo) : null,
          cartaUrl: cartaUrl ?? null,
        },
      })
      return NextResponse.json({ action: created }, { status: 201 })
    } catch (err) {
      console.error('[workers/disciplina POST]', err)
      return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
    }
  }
)
