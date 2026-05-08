import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { listContractVersions } from '@/lib/contracts/versioning/service'

// =============================================
// GET /api/contracts/[id]/versions
// Lista todas las versiones del contrato con metadata + hashes.
// =============================================
export const GET = withPlanGateParams<{ id: string }>('contratos', async (_req: NextRequest, ctx: AuthContext, params) => {
  // Asegurar que el contrato pertenece a la org
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const versions = await listContractVersions(params.id, ctx.orgId)

  // Devolvemos sin contentHtml/contentJson en la lista (peso). Para ver el
  // contenido completo de una versión, GET /[vid].
  return NextResponse.json({
    data: versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      contentSha256: v.contentSha256,
      prevHash: v.prevHash,
      versionHash: v.versionHash,
      diffSummary: v.diffSummary,
      changeReason: v.changeReason,
      changedBy: v.changedBy,
      createdAt: v.createdAt.toISOString(),
    })),
  })
})

