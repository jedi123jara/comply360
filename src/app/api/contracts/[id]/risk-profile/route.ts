import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { computeContractRiskProfile } from '@/lib/contracts/risk/service'

// =============================================
// GET /api/contracts/[id]/risk-profile
// Risk-profile completo del contrato. Combina:
//   - Resultados de validation engine (chunk 1)
//   - Detección de régimen + conflict con declarado (chunk 2)
//   - Verificación criptográfica del hash-chain (chunk 3)
// → score 0-100 + nivel + multa estimada en UIT/PEN.
//
// Consumido por:
//   - SUNAFIL Diagnostic (auditoría preventiva del set de contratos)
//   - UI del detalle del contrato (badge en header)
//   - Reportes ejecutivos
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const profile = await computeContractRiskProfile(params.id, ctx.orgId)
    return NextResponse.json({ data: profile })
  } catch (err) {
    if (err instanceof Error && err.message.includes('no encontrado')) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }
    console.error('[GET /api/contracts/:id/risk-profile]', err)
    return NextResponse.json({ error: 'Error computando risk-profile' }, { status: 500 })
  }
})
