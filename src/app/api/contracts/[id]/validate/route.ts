import { NextRequest, NextResponse } from 'next/server'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  runValidationPipeline,
  getContractValidations,
  ContractNotFoundError,
} from '@/lib/contracts/validation/engine'

// =============================================
// POST /api/contracts/[id]/validate
// Corre el motor de validación contra el contrato y persiste resultados.
// =============================================
export const POST = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const result = await runValidationPipeline(params.id, ctx.orgId, {
      triggeredBy: ctx.userId,
      trigger: 'manual',
    })
    return NextResponse.json({ data: result })
  } catch (err) {
    if (err instanceof ContractNotFoundError) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }
    console.error('[POST /api/contracts/:id/validate]', err)
    return NextResponse.json(
      { error: 'No se pudo ejecutar la validación' },
      { status: 500 },
    )
  }
})

// =============================================
// GET /api/contracts/[id]/validate
// Devuelve la última corrida persistida (sin re-ejecutar).
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  try {
    const validations = await getContractValidations(params.id, ctx.orgId)
    const failed = validations.filter((v: typeof validations[number]) => !v.passed)
    return NextResponse.json({
      data: {
        contractId: params.id,
        totalRules: validations.length,
        passed: validations.length - failed.length,
        failed: failed.length,
        blockers: failed.filter((v: typeof failed[number]) => v.severity === 'BLOCKER').length,
        warnings: failed.filter((v: typeof failed[number]) => v.severity === 'WARNING').length,
        infos: failed.filter((v: typeof failed[number]) => v.severity === 'INFO').length,
        validations,
      },
    })
  } catch (err) {
    console.error('[GET /api/contracts/:id/validate]', err)
    return NextResponse.json(
      { error: 'No se pudieron leer las validaciones' },
      { status: 500 },
    )
  }
})
