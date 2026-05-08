import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { verifyMerkleProof } from '@/lib/contracts/anchoring/merkle'
import type { MerkleProofStep } from '@/lib/contracts/anchoring/merkle'

// =============================================
// GET /api/contracts/[id]/versions/[vnum]/proof
// Devuelve la prueba Merkle de inclusión de la versión + el merkleRoot
// del día (con su anclaje externo si lo hay). Sirve como evidencia
// inmutable: el receptor puede recomputar y verificar offline con
// solo el versionHash, el proof y la merkleRoot publicada.
// =============================================
export const GET = withPlanGateParams<{ id: string; vnum: string }>('contratos', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const versionNumber = parseInt(params.vnum, 10)
    if (Number.isNaN(versionNumber) || versionNumber < 1) {
      return NextResponse.json({ error: 'versionNumber inválido' }, { status: 400 })
    }

    const version = await prisma.contractVersion.findUnique({
      where: { contractId_versionNumber: { contractId: params.id, versionNumber } },
      include: {
        merkleAnchor: {
          select: {
            id: true,
            anchorDate: true,
            merkleRoot: true,
            leafCount: true,
            status: true,
            rfc3161Tsa: true,
            rfc3161At: true,
            otsCalendar: true,
            otsAt: true,
            bitcoinBlockHeight: true,
          },
        },
      },
    })

    if (!version || version.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })
    }

    if (!version.merkleAnchorId || !version.merkleAnchor || !version.merkleProof) {
      return NextResponse.json(
        {
          data: {
            anchored: false,
            message:
              'Esta versión aún no fue anclada. El cron diario procesa las versiones del día UTC anterior.',
            versionHash: version.versionHash,
            createdAt: version.createdAt.toISOString(),
          },
        },
      )
    }

    const proof = version.merkleProof as unknown as MerkleProofStep[]
    const verifies = verifyMerkleProof(version.versionHash, proof, version.merkleAnchor.merkleRoot)

    return NextResponse.json({
      data: {
        anchored: true,
        contractId: version.contractId,
        versionNumber: version.versionNumber,
        versionHash: version.versionHash,
        leafIndex: version.leafIndex,
        merkleProof: proof,
        merkleRoot: version.merkleAnchor.merkleRoot,
        anchorDate: version.merkleAnchor.anchorDate.toISOString().slice(0, 10),
        anchorStatus: version.merkleAnchor.status,
        leafCount: version.merkleAnchor.leafCount,
        verifies, // re-verificación server-side de cortesía
        externalAnchoring: {
          rfc3161: version.merkleAnchor.rfc3161Tsa
            ? {
                tsa: version.merkleAnchor.rfc3161Tsa,
                at: version.merkleAnchor.rfc3161At?.toISOString() ?? null,
              }
            : null,
          opentimestamps: version.merkleAnchor.otsCalendar
            ? {
                calendar: version.merkleAnchor.otsCalendar,
                at: version.merkleAnchor.otsAt?.toISOString() ?? null,
                bitcoinBlockHeight: version.merkleAnchor.bitcoinBlockHeight,
              }
            : null,
        },
      },
    })
  },
)

