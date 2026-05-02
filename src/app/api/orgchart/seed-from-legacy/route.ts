import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { previewLegacySeed, applyLegacySeed } from '@/lib/orgchart/seed-from-legacy'
import { prisma } from '@/lib/prisma'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'

export const GET = withRole('ADMIN', async (_req, ctx) => {
  const preview = await previewLegacySeed(ctx.orgId)
  return NextResponse.json(preview)
})

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const dryRun = !!body?.dryRun
  if (dryRun) {
    const preview = await previewLegacySeed(ctx.orgId)
    return NextResponse.json({ ...preview, dryRun: true })
  }
  const result = await applyLegacySeed(ctx.orgId, ctx.userId)

  // Tomar snapshot inicial
  await takeSnapshot(ctx.orgId, {
    label: 'Bootstrap inicial desde datos legacy',
    reason: 'Seed automático desde Worker.position/department',
    takenById: ctx.userId,
    isAuto: true,
  }).catch(() => {})

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.bootstrap',
      metadataJson: result as object,
    },
  }).catch(() => {})

  return NextResponse.json(result)
})
