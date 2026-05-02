import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? 50)
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 50
  const entityType = req.nextUrl.searchParams.get('entityType')

  const logs = await prisma.orgStructureChangeLog.findMany({
    where: {
      orgId: ctx.orgId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const actorIds = Array.from(new Set(logs.map(log => log.performedById).filter(Boolean) as string[]))
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const actorById = new Map(actors.map(actor => [actor.id, actor]))

  return NextResponse.json({
    changes: logs.map(log => {
      const actor = log.performedById ? actorById.get(log.performedById) : null
      return {
        id: log.id,
        type: log.type,
        entityType: log.entityType,
        entityId: log.entityId,
        reason: log.reason,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        summary: summarizeChange(log.type, log.entityType, log.afterJson, log.beforeJson),
        actor: actor
          ? {
              id: actor.id,
              name: `${actor.firstName ?? ''} ${actor.lastName ?? ''}`.trim() || actor.email,
              email: actor.email,
            }
          : null,
      }
    }),
  })
})

function summarizeChange(type: string, entityType: string, afterJson: unknown, beforeJson: unknown) {
  const after = asRecord(afterJson)
  const before = asRecord(beforeJson)
  const name = textValue(after.title) || textValue(after.name) || textValue(after.label) || textValue(after.templateName)
  const beforeName = textValue(before.title) || textValue(before.name)

  if (type.includes('CREATE')) return `${labelEntity(entityType)} creado${name ? `: ${name}` : ''}`
  if (type.includes('DELETE') || type.includes('END')) return `${labelEntity(entityType)} archivado${beforeName ? `: ${beforeName}` : ''}`
  if (type.includes('MOVE') || type.includes('REPARENT')) return `${labelEntity(entityType)} movido${name ? `: ${name}` : ''}`
  if (type.includes('SNAPSHOT')) return `Snapshot creado${name ? `: ${name}` : ''}`
  if (type.includes('PUBLIC_LINK')) return 'Auditor Link generado'
  if (type.includes('REASSIGN')) return `${labelEntity(entityType)} reasignado${name ? `: ${name}` : ''}`
  return `${labelEntity(entityType)} actualizado${name ? `: ${name}` : ''}`
}

function labelEntity(entityType: string) {
  const labels: Record<string, string> = {
    OrgUnit: 'Unidad',
    OrgPosition: 'Cargo',
    OrgAssignment: 'Asignación',
    OrgComplianceRole: 'Rol legal',
    OrgChartSnapshot: 'Snapshot',
    OrgTemplate: 'Plantilla',
    OrgChartImport: 'Importación',
  }
  return labels[entityType] ?? entityType
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
