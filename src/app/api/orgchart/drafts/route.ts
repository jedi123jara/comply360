import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { requestIp } from '@/lib/orgchart/change-log'
import { createWhatIfDraft, listWhatIfDrafts, WhatIfScenarioError } from '@/lib/orgchart/what-if'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 30)
  const drafts = await listWhatIfDrafts(ctx.orgId, Number.isFinite(limitParam) ? limitParam : 30)
  return NextResponse.json({ drafts })
})

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const positionId = typeof body?.positionId === 'string' ? body.positionId : ''
  const newParentId = typeof body?.newParentId === 'string' ? body.newParentId : ''

  if (!name || !positionId || !newParentId) {
    return NextResponse.json({ error: 'name, positionId y newParentId son requeridos' }, { status: 400 })
  }

  try {
    const draft = await createWhatIfDraft(ctx.orgId, {
      name,
      positionId,
      newParentId,
      createdById: ctx.userId,
      ipAddress: requestIp(req.headers),
    })
    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    if (error instanceof WhatIfScenarioError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    throw error
  }
})
