/**
 * GET /api/orgchart/people?search=&unit=&contract=&onlyAtRisk=
 *
 * Lista de trabajadores con score de compliance individual y flags de
 * riesgo SUNAFIL. Usado por el Trombinoscopio compliance.
 */
import { NextRequest, NextResponse } from 'next/server'

import { withRole } from '@/lib/api-auth'
import { buildPeopleView } from '@/lib/orgchart/people-view'

export const runtime = 'nodejs'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const result = await buildPeopleView(ctx.orgId, {
    search: sp.get('search') ?? undefined,
    unitId: sp.get('unit') ?? undefined,
    contractType: sp.get('contract') ?? undefined,
    onlyAtRisk: sp.get('onlyAtRisk') === '1',
  })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
})
