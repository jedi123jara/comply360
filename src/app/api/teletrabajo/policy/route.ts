import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { getPolicy, upsertPolicy } from '@/lib/teletrabajo'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const policy = getPolicy(ctx.orgId)
  return NextResponse.json({ policy })
})

export const PUT = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const policy = upsertPolicy(ctx.orgId, {
    horaDesconexionInicio: body.horaDesconexionInicio as string | undefined,
    horaDesconexionFin: body.horaDesconexionFin as string | undefined,
    diasNoLaborables: body.diasNoLaborables as number[] | undefined,
    textoPolitica: body.textoPolitica as string | undefined,
    bloqueoAutomatico: body.bloqueoAutomatico as boolean | undefined,
  })
  return NextResponse.json({ policy })
})
