import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { getTeleworkSummary } from '@/lib/teletrabajo'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  return NextResponse.json(getTeleworkSummary(ctx.orgId))
})
