/**
 * GET /api/audit/verify — FIX #7.D
 *
 * Verifica la integridad del hash chain de audit logs para la org del
 * usuario logueado. Solo OWNER puede correr esto (es función forense /
 * compliance, no operacional).
 */

import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { verifyAuditChain } from '@/lib/audit/hash-chain'

export const GET = withRole('OWNER', async (_req, ctx) => {
  const result = await verifyAuditChain(ctx.orgId)
  return NextResponse.json({
    orgId: ctx.orgId,
    ...result,
  })
})
