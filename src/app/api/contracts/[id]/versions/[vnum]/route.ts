import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/contracts/[id]/versions/[vnum]
// Devuelve una versión específica con contentHtml/contentJson/formData
// completos para UI de revisión.
// =============================================
export const GET = withAuthParams<{ id: string; vnum: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const versionNumber = parseInt(params.vnum, 10)
    if (Number.isNaN(versionNumber) || versionNumber < 1) {
      return NextResponse.json({ error: 'versionNumber inválido' }, { status: 400 })
    }

    const contract = await prisma.contract.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const version = await prisma.contractVersion.findUnique({
      where: { contractId_versionNumber: { contractId: params.id, versionNumber } },
    })
    if (!version || version.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...version,
        createdAt: version.createdAt.toISOString(),
      },
    })
  },
)
