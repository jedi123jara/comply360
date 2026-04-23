import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { createLog, listLogs } from '@/lib/teletrabajo'

export const runtime = 'nodejs'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const logs = listLogs(ctx.orgId, {
    workerId: searchParams.get('workerId') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })
  return NextResponse.json({ logs })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: {
    workerId?: string
    fecha?: string
    horaInicio?: string
    horaFin?: string
    tipo?: 'ORDINARIA' | 'EXTRA' | 'DESCANSO'
    notas?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  if (!body.workerId || !body.fecha || !body.horaInicio || !body.horaFin) {
    return NextResponse.json(
      { error: 'workerId, fecha, horaInicio y horaFin son requeridos' },
      { status: 400 }
    )
  }
  try {
    const log = createLog({
      orgId: ctx.orgId,
      workerId: body.workerId,
      fecha: body.fecha,
      horaInicio: body.horaInicio,
      horaFin: body.horaFin,
      tipo: body.tipo,
      notas: body.notas,
    })
    return NextResponse.json({ log }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'No se pudo guardar el log de teletrabajo' },
      { status: 400 }
    )
  }
})
