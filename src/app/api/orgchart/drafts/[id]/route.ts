import { NextRequest, NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { requestIp } from '@/lib/orgchart/change-log'
import {
  applyWhatIfDraft,
  discardWhatIfDraft,
  WhatIfDraftNotFoundError,
  WhatIfScenarioError,
} from '@/lib/orgchart/what-if'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = withRoleParams<{ id: string }>('ADMIN', async (req: NextRequest, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action.toUpperCase() : ''

  try {
    if (action === 'APPLY') {
      const draft = await applyWhatIfDraft(ctx.orgId, params.id, {
        userId: ctx.userId,
        ipAddress: requestIp(req.headers),
      })
      return NextResponse.json({ draft })
    }
    if (action === 'DISCARD') {
      const draft = await discardWhatIfDraft(ctx.orgId, params.id, {
        userId: ctx.userId,
        ipAddress: requestIp(req.headers),
      })
      return NextResponse.json({ draft })
    }
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    if (error instanceof WhatIfDraftNotFoundError) {
      return NextResponse.json({ error: 'Escenario no encontrado' }, { status: 404 })
    }
    if (error instanceof WhatIfScenarioError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    throw error
  }
})
