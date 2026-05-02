import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { detectRegimeForOrg } from '@/lib/contracts/regime/service'

// =============================================
// GET /api/contracts/detect-regime
// Devuelve la detección automática de régimen laboral para la org actual.
// Útil al abrir el wizard de creación de contratos para sugerir tipo
// y filtrar plantillas aplicables.
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const result = await detectRegimeForOrg(ctx.orgId)

    // Detectar conflicto entre régimen detectado y régimen declarado.
    const declared = result.org.declaredRegimen
    const conflict =
      declared !== null && declared !== '' && declared !== result.primaryRegime

    return NextResponse.json({
      data: {
        primaryRegime: result.primaryRegime,
        applicableSpecialRegimes: result.applicableSpecialRegimes,
        confidence: result.confidence,
        reasoning: result.reasoning,
        warnings: result.warnings,
        flags: result.flags,
        organization: result.org,
        conflict: conflict
          ? {
              declared,
              detected: result.primaryRegime,
              message: `El régimen declarado (${declared}) difiere del detectado por el sistema (${result.primaryRegime}). Verifica los datos de tu empresa.`,
            }
          : null,
      },
    })
  } catch (err) {
    console.error('[GET /api/contracts/detect-regime]', err)
    return NextResponse.json(
      { error: 'No se pudo determinar el régimen automáticamente.' },
      { status: 500 },
    )
  }
})
