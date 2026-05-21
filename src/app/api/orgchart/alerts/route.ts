import { NextResponse } from 'next/server'
import { withPermission } from '@/lib/api-auth'
import { getOrgAlerts } from '@/lib/orgchart/alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withPermission('ORGCHART_VIEW', async (_req, ctx) => {
  const report = await getOrgAlerts(ctx.orgId)
  return NextResponse.json(report)
})
