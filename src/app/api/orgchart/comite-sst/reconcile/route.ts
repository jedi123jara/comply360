import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { reconcileComiteSstFromOrgUnit } from '@/lib/orgchart/comite-sst-sync'

export const dynamic = 'force-dynamic'

/**
 * Espeja la unidad del comité SST del organigrama al modelo legal ComiteSST /
 * MiembroComite (módulo SST Premium). No-op si la unidad no es el comité SST.
 * Plan-gated: solo orgs con el módulo SST. Si no lo tienen, el cliente recibe
 * 403 y degrada (no sincroniza).
 */
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const orgUnitId = typeof body?.orgUnitId === 'string' ? body.orgUnitId : null
  if (!orgUnitId) {
    return NextResponse.json({ error: 'orgUnitId requerido' }, { status: 400 })
  }
  const result = await reconcileComiteSstFromOrgUnit(ctx.orgId, orgUnitId)
  return NextResponse.json(result)
})
