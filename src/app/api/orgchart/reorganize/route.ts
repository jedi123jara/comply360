import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getTree } from '@/lib/orgchart/tree-service'
import { inferPositionHierarchy } from '@/lib/orgchart/hierarchy-inference'
import { requestIp } from '@/lib/orgchart/change-log'

export const POST = withRole('ADMIN', async (req, ctx) => {
  const tree = await getTree(ctx.orgId)
  const hierarchy = inferPositionHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
  })

  const changes = tree.positions
    .map((position) => ({
      position,
      nextParentId: hierarchy.parentByPosition.get(position.id) ?? null,
    }))
    .filter(({ position, nextParentId }) => {
      if (!nextParentId) return false
      return position.reportsToPositionId !== nextParentId
    })

  if (changes.length === 0) {
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.positions.reorganize.noop',
        metadataJson: {
          positions: tree.positions.length,
          reason: 'hierarchy_already_organized',
        } as object,
      },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      changedCount: 0,
      totalPositions: tree.positions.length,
      changes: [],
    })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const results: Array<{
      positionId: string
      title: string
      previousParentId: string | null
      nextParentId: string
    }> = []

    for (const change of changes) {
      const before = await tx.orgPosition.findFirst({
        where: { id: change.position.id, orgId: ctx.orgId, validTo: null },
      })
      if (!before || !change.nextParentId) continue

      const after = await tx.orgPosition.update({
        where: { id: before.id },
        data: { reportsToPositionId: change.nextParentId },
      })

      await tx.orgStructureChangeLog.create({
        data: {
          orgId: ctx.orgId,
          type: 'POSITION_REPARENT',
          entityType: 'OrgPosition',
          entityId: before.id,
          beforeJson: JSON.parse(JSON.stringify(before)) as object,
          afterJson: JSON.parse(JSON.stringify(after)) as object,
          performedById: ctx.userId,
          ipAddress: requestIp(req.headers),
          reason: 'Reorganización automática de jerarquía existente',
        },
      })

      results.push({
        positionId: before.id,
        title: before.title,
        previousParentId: before.reportsToPositionId,
        nextParentId: change.nextParentId,
      })
    }

    await tx.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.positions.reorganized',
        metadataJson: {
          changedCount: results.length,
          totalPositions: tree.positions.length,
          changes: results,
        } as object,
      },
    })

    return results
  })

  return NextResponse.json({
    ok: true,
    changedCount: updated.length,
    totalPositions: tree.positions.length,
    changes: updated,
  })
})
