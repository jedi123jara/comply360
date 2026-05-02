import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { publicLinkSchema } from '@/lib/orgchart/zod-schemas'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'
import { signAuditorToken } from '@/lib/orgchart/public-link/token'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = publicLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  // Tomar snapshot fresco para que el link refleje el estado actual
  const snap = await takeSnapshot(ctx.orgId, {
    label: `Auditor Link ${new Date().toISOString().slice(0, 10)}`,
    reason: 'Generación de Auditor Link',
    takenById: ctx.userId,
    isAuto: false,
  })

  const token = signAuditorToken({
    orgId: ctx.orgId,
    snapshotId: snap.id,
    hash: snap.hash,
    includeWorkers: parsed.data.includeWorkers,
    includeComplianceRoles: parsed.data.includeComplianceRoles,
    expiresInHours: parsed.data.expiresInHours,
  })

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (req.headers.get('origin') ?? '')
  const url = `${baseUrl}/audit/orgchart/${token}`

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + parsed.data.expiresInHours)

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.public_link.created',
      metadataJson: {
        snapshotId: snap.id,
        hash: snap.hash,
        expiresAt: expiresAt.toISOString(),
        includeWorkers: parsed.data.includeWorkers,
      } as object,
    },
  }).catch(() => {})

  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'PUBLIC_LINK_CREATE',
    entityType: 'OrgChartSnapshot',
    entityId: snap.id,
    afterJson: {
      snapshotId: snap.id,
      hash: snap.hash,
      expiresAt: expiresAt.toISOString(),
      includeWorkers: parsed.data.includeWorkers,
      includeComplianceRoles: parsed.data.includeComplianceRoles,
    },
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
    reason: 'Auditor Link',
  }).catch(() => {})

  return NextResponse.json({
    token,
    url,
    expiresAt: expiresAt.toISOString(),
    hash: snap.hash,
    snapshotId: snap.id,
  })
})
