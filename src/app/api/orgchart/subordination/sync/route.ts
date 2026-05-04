import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { syncSubordinationRiskEvents } from '@/lib/orgchart/subordination-risk-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withRole('ADMIN', async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const report = await syncSubordinationRiskEvents(ctx.orgId, {
    actorUserId: ctx.userId,
    createTasks: body?.createTasks !== false,
    includeMediumTasks: body?.includeMediumTasks === true,
  })

  return NextResponse.json(report)
})
