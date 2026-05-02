import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { monitorOrgAlerts } from '@/lib/orgchart/alert-monitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withRole('MEMBER', async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const includeMedium = body?.includeMedium === true
  const report = await monitorOrgAlerts(ctx.orgId, {
    includeMedium,
    actorUserId: ctx.userId,
  })
  return NextResponse.json(report)
})
