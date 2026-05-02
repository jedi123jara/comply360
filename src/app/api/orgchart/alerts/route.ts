import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { getOrgAlerts } from '@/lib/orgchart/alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (_req, ctx) => {
  const report = await getOrgAlerts(ctx.orgId)
  return NextResponse.json(report)
})
