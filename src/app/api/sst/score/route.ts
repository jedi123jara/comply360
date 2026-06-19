import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularScoreSst } from '@/lib/sst/scoring'
import { loadSstScoreSnapshot } from '@/lib/sst/score-snapshot'

// =============================================
// GET /api/sst/score
//
// Calcula y devuelve el score SST específico de la org del usuario logueado:
//   - scoreGlobal 0-100
//   - semáforo VERDE/AMARILLO/ROJO
//   - breakdown por dimensión (IPERC, EMO, SAT, Comité, Field Audit, Sedes)
//   - exposición económica en S/ (D.S. 019-2006-TR + UIT 2026)
//   - recomendaciones priorizadas
// =============================================
export const GET = withPlanGate('sst_completo', async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const now = new Date()
  const { snapshot, contexto, snapshotResumen } = await loadSstScoreSnapshot(orgId, now)
  const result = calcularScoreSst(snapshot, now)

  return NextResponse.json({
    ...result,
    contexto,
    snapshotResumen,
  })
})
