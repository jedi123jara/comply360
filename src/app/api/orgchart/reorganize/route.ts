import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getTree } from '@/lib/orgchart/tree-service'
import {
  inferPositionHierarchy,
  inferUnitHierarchy,
  isParallelGovernanceUnit,
} from '@/lib/orgchart/hierarchy-inference'
import { requestIp } from '@/lib/orgchart/change-log'
import { rebuildClosure } from '@/lib/orgchart/closure-maintenance'

export const POST = withRole('ADMIN', async (req, ctx) => {
  const tree = await getTree(ctx.orgId)
  const parallelUnitIds = new Set(
    tree.units.filter(isParallelGovernanceUnit).map((unit) => unit.id),
  )
  const unitHierarchy = inferUnitHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
    excludedUnitIds: parallelUnitIds,
  })
  const hierarchy = inferPositionHierarchy({
    units: tree.units,
    positions: tree.positions,
    assignments: tree.assignments,
    excludedUnitIds: parallelUnitIds,
  })

  const nextUnitLevels = computeUnitLevels(tree.units, unitHierarchy.parentByUnit)
  const unitChanges = tree.units
    .map((unit) => ({
      unit,
      nextParentId: unitHierarchy.parentByUnit.get(unit.id) ?? null,
      nextLevel: nextUnitLevels.get(unit.id) ?? 0,
    }))
    .filter(({ unit, nextParentId, nextLevel }) => {
      if (parallelUnitIds.has(unit.id)) return false
      return unit.parentId !== nextParentId || unit.level !== nextLevel
    })

  const positionChanges = tree.positions
    .map((position) => ({
      position,
      nextParentId: hierarchy.parentByPosition.get(position.id) ?? null,
    }))
    .filter(({ position, nextParentId }) => {
      if (parallelUnitIds.has(position.orgUnitId)) return false
      if (!nextParentId) return false
      return position.reportsToPositionId !== nextParentId
    })

  if (unitChanges.length === 0 && positionChanges.length === 0) {
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.positions.reorganize.noop',
        metadataJson: {
          units: tree.units.length,
          positions: tree.positions.length,
          reason: 'hierarchy_already_organized',
        } as object,
      },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      changedCount: 0,
      unitsChanged: 0,
      positionsChanged: 0,
      totalUnits: tree.units.length,
      totalPositions: tree.positions.length,
      unitChanges: [],
      changes: [],
    })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const unitResults: Array<{
      unitId: string
      name: string
      previousParentId: string | null
      nextParentId: string | null
    }> = []
    const positionResults: Array<{
      positionId: string
      title: string
      previousParentId: string | null
      nextParentId: string
    }> = []

    for (const change of unitChanges) {
      const before = await tx.orgUnit.findFirst({
        where: { id: change.unit.id, orgId: ctx.orgId, validTo: null, isActive: true },
      })
      if (!before) continue

      const after = await tx.orgUnit.update({
        where: { id: before.id },
        data: {
          parentId: change.nextParentId,
          level: change.nextLevel,
          version: { increment: 1 },
        },
      })

      await tx.orgStructureChangeLog.create({
        data: {
          orgId: ctx.orgId,
          type: 'UNIT_MOVE',
          entityType: 'OrgUnit',
          entityId: before.id,
          beforeJson: JSON.parse(JSON.stringify(before)) as object,
          afterJson: JSON.parse(JSON.stringify(after)) as object,
          performedById: ctx.userId,
          ipAddress: requestIp(req.headers),
          reason: 'Plantilla automática de procesos y jerarquía empresarial',
        },
      })

      unitResults.push({
        unitId: before.id,
        name: before.name,
        previousParentId: before.parentId,
        nextParentId: change.nextParentId,
      })
    }

    for (const change of positionChanges) {
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

      positionResults.push({
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
          changedCount: unitResults.length + positionResults.length,
          unitsChanged: unitResults.length,
          positionsChanged: positionResults.length,
          totalUnits: tree.units.length,
          totalPositions: tree.positions.length,
          unitChanges: unitResults,
          changes: positionResults,
        } as object,
      },
    })

    return { unitResults, positionResults }
  })

  if (updated.unitResults.length > 0) {
    await rebuildClosure(ctx.orgId)
  }

  return NextResponse.json({
    ok: true,
    changedCount: updated.unitResults.length + updated.positionResults.length,
    unitsChanged: updated.unitResults.length,
    positionsChanged: updated.positionResults.length,
    totalUnits: tree.units.length,
    totalPositions: tree.positions.length,
    unitChanges: updated.unitResults,
    changes: updated.positionResults,
  })
})

function computeUnitLevels(
  units: Array<{ id: string; parentId: string | null }>,
  parentByUnit: ReadonlyMap<string, string | null>,
) {
  const unitIds = new Set(units.map((unit) => unit.id))
  const levels = new Map<string, number>()

  function visit(unitId: string, seen = new Set<string>()): number {
    if (levels.has(unitId)) return levels.get(unitId) ?? 0
    if (seen.has(unitId)) return 0
    seen.add(unitId)
    const parentId = parentByUnit.get(unitId) ?? null
    const level = parentId && unitIds.has(parentId) ? visit(parentId, seen) + 1 : 0
    levels.set(unitId, level)
    return level
  }

  for (const unit of units) visit(unit.id)
  return levels
}
