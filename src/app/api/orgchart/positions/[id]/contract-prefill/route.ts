import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { getOrgPositionContractPrefill } from '@/lib/orgchart/contract-prefill'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRoleParams<{ id: string }>('MEMBER', async (_req, ctx, params) => {
  try {
    const prefill = await getOrgPositionContractPrefill(ctx.orgId, params.id)
    return NextResponse.json(prefill)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo preparar el contrato desde el cargo'
    return NextResponse.json({ error: message }, { status: 404 })
  }
})
