import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { getSubordinationDossier } from '@/lib/orgchart/subordination-dossier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (_req, ctx) => {
  const dossier = await getSubordinationDossier(ctx.orgId)
  return NextResponse.json(dossier)
})
