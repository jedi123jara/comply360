import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/integrations/sunat-sol/status — Quick status check
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  const credential = await prisma.integrationCredential.findUnique({
    where: { orgId_provider: { orgId, provider: 'sunat_sol' } },
    select: {
      isActive: true,
      lastTestedAt: true,
      lastSyncAt: true,
      lastSyncResult: true,
      label: true,
    },
  })

  if (!credential) {
    return NextResponse.json({
      status: 'not_configured',
      label: null,
      lastTestedAt: null,
      lastSyncAt: null,
    })
  }

  const syncResult = credential.lastSyncResult as Record<string, unknown> | null

  return NextResponse.json({
    status: credential.isActive
      ? (credential.lastTestedAt ? 'connected' : 'pending_test')
      : 'disabled',
    label: credential.label,
    lastTestedAt: credential.lastTestedAt?.toISOString() ?? null,
    lastSyncAt: credential.lastSyncAt?.toISOString() ?? null,
    lastSyncSuccess: syncResult?.success ?? null,
    discrepancies: syncResult?.discrepancies ?? null,
  })
})
