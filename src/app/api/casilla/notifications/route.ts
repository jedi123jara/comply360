import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  listNotifications,
  ingestNotification,
  getCasillaSummary,
  type CasillaNotificationType,
} from '@/lib/integrations/casilla-sunafil'

export const runtime = 'nodejs'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('summary') === '1') {
    return NextResponse.json(getCasillaSummary(ctx.orgId))
  }
  const list = listNotifications(ctx.orgId)
  return NextResponse.json({ notifications: list, summary: getCasillaSummary(ctx.orgId) })
})

/** Manual ingest (subida manual de notificación por el usuario) */
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body.numeroOficial || !body.asunto || !body.fechaNotificacion) {
    return NextResponse.json(
      { error: 'numeroOficial, asunto y fechaNotificacion son requeridos' },
      { status: 400 }
    )
  }
  const n = ingestNotification({
    orgId: ctx.orgId,
    numeroOficial: String(body.numeroOficial),
    tipo: (body.tipo as CasillaNotificationType) || 'OTRO',
    fechaNotificacion: String(body.fechaNotificacion),
    fechaIngreso: String(body.fechaIngreso || new Date().toISOString().slice(0, 10)),
    asunto: String(body.asunto),
    inspector: body.inspector as string | undefined,
    intendenciaRegional: body.intendenciaRegional as string | undefined,
    plazoDiasHabiles: Number(body.plazoDiasHabiles ?? 15),
    documentoUrl: body.documentoUrl as string | undefined,
  })
  return NextResponse.json({ notification: n }, { status: 201 })
})
