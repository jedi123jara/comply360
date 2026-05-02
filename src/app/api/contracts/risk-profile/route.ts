import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { listContractsRiskSummary } from '@/lib/contracts/risk/service'

// =============================================
// GET /api/contracts/risk-profile
// Risk-profile agregado de TODOS los contratos del tenant.
// Optimizado para listados (no recomputa la chain por contrato).
// Útil para SUNAFIL Diagnostic y reportes.
//
// Query params:
//   ?status=DRAFT|IN_REVIEW|...  filtrar por estado
//   ?limit=N  (default 100)
//   ?orderBy=score|level         ordenar por riesgo (default: actualizado)
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') ?? '100', 10)
  const orderBy = searchParams.get('orderBy')

  try {
    let summary = await listContractsRiskSummary(ctx.orgId, {
      limit: Math.min(Math.max(limit, 1), 500),
      ...(status ? { status } : {}),
    })

    if (orderBy === 'score') {
      summary = summary.sort((a, b) => a.score - b.score) // peor riesgo primero
    } else if (orderBy === 'level') {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      summary = summary.sort((a, b) => order[a.level] - order[b.level])
    }

    // Agregados rápidos para el cockpit
    const totals = {
      contracts: summary.length,
      blockers: summary.filter((s) => s.hasBlockingIssues).length,
      critical: summary.filter((s) => s.level === 'CRITICAL').length,
      high: summary.filter((s) => s.level === 'HIGH').length,
      medium: summary.filter((s) => s.level === 'MEDIUM').length,
      low: summary.filter((s) => s.level === 'LOW').length,
      averageScore: summary.length === 0 ? 100 : Math.round(summary.reduce((acc, s) => acc + s.score, 0) / summary.length),
      totalEstimatedFineUIT: summary.reduce((acc, s) => acc + s.estimatedFineUIT, 0),
      totalEstimatedFinePEN: summary.reduce((acc, s) => acc + s.estimatedFinePEN, 0),
    }

    return NextResponse.json({ data: { totals, contracts: summary } })
  } catch (err) {
    console.error('[GET /api/contracts/risk-profile]', err)
    return NextResponse.json({ error: 'Error computando risk-profile agregado' }, { status: 500 })
  }
})
