import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { verifyContractChain } from '@/lib/contracts/versioning/service'

// =============================================
// GET /api/contracts/[id]/versions/verify
// Recomputa el hash-chain del contrato y reporta si la cadena está íntegra.
// Si alguien manipuló una fila de contract_versions en BD, este endpoint
// lo detecta y retorna `valid:false` con la versión donde se rompió.
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const { versions, result } = await verifyContractChain(params.id, ctx.orgId)

  return NextResponse.json({
    data: {
      contractId: params.id,
      versions,
      ...result,
      verifiedAt: new Date().toISOString(),
    },
  })
})
