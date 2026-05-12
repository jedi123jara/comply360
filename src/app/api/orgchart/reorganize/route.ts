import { NextResponse } from 'next/server'

import { withRole } from '@/lib/api-auth'
import { inferAndApplyHierarchy, previewHierarchyInference } from '@/lib/orgchart/auto-hierarchy'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

/**
 * GET → vista previa de qué se movería si se aplica la inferencia.
 *       Útil para el modal de confirmación antes de aceptar.
 */
export const GET = withRole('MEMBER', async (_req, ctx) => {
  const preview = await previewHierarchyInference(ctx.orgId)

  return NextResponse.json({
    rootCandidate: preview.rootCandidate
      ? {
          id: preview.rootCandidate.id,
          name: preview.rootCandidate.name,
          kind: preview.rootCandidate.kind,
        }
      : null,
    willPromote: preview.willPromote,
    unitsToReparent: preview.unitsToReparent.map((u) => ({
      id: u.id,
      name: u.name,
      kind: u.kind,
    })),
    reason: preview.reason ?? null,
  })
})

/**
 * POST → aplica la jerarquía: detecta la unidad raíz (Gerencia) y mueve las
 * áreas huérfanas para que cuelguen de ella. Reconstruye el closure transitivo.
 *
 * Requiere rol ADMIN porque modifica la estructura del organigrama.
 */
export const POST = withRole('ADMIN', async (req, ctx) => {
  try {
    const result = await inferAndApplyHierarchy(ctx.orgId)

    if (result.reparented === 0 && !result.promoted) {
      // No-op informativo: nada que reorganizar (o no había candidato).
      return NextResponse.json(result)
    }

    // Audit + change log para trazabilidad.
    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'orgchart.reorganize',
          metadataJson: {
            rootUnitId: result.rootUnitId,
            rootUnitName: result.rootUnitName,
            reparented: result.reparented,
            promoted: result.promoted,
          } as object,
        },
      })
      .catch(() => {})

    if (result.rootUnitId) {
      await recordStructureChange({
        orgId: ctx.orgId,
        type: 'UNIT_MOVE',
        entityType: 'OrgUnit',
        entityId: result.rootUnitId,
        beforeJson: undefined,
        afterJson: { ...result } as Record<string, unknown>,
        performedById: ctx.userId,
        ipAddress: requestIp(req.headers),
      }).catch(() => {})
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reorganizar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
