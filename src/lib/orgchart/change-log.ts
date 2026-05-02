import { prisma } from '@/lib/prisma'
import type { OrgStructureChangeType } from '@/generated/prisma/client'

type Jsonish = Record<string, unknown> | unknown[] | string | number | boolean | null

interface RecordStructureChangeInput {
  orgId: string
  type: OrgStructureChangeType
  entityType: string
  entityId: string
  beforeJson?: Jsonish
  afterJson?: Jsonish
  performedById?: string | null
  ipAddress?: string | null
  reason?: string | null
}

export async function recordStructureChange(input: RecordStructureChangeInput) {
  return prisma.orgStructureChangeLog.create({
    data: {
      orgId: input.orgId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeJson: toPrismaJson(input.beforeJson),
      afterJson: toPrismaJson(input.afterJson),
      performedById: input.performedById ?? null,
      ipAddress: input.ipAddress ?? null,
      reason: input.reason ?? null,
    },
  })
}

function toPrismaJson(value: Jsonish | undefined) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value)) as object
}

export function requestIp(headers: Headers) {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    null
  )
}
