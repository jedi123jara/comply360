import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withRole } from '@/lib/api-auth'
import { createSnapshotSchema } from '@/lib/orgchart/zod-schemas'
import { takeSnapshot, listSnapshots } from '@/lib/orgchart/snapshot-service'

export const GET = withAuth(async (_req, ctx) => {
  const list = await listSnapshots(ctx.orgId, 100)
  return NextResponse.json({ snapshots: list })
})

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createSnapshotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  const snap = await takeSnapshot(ctx.orgId, {
    label: parsed.data.label,
    reason: parsed.data.reason ?? null,
    takenById: ctx.userId,
    isAuto: false,
  })
  return NextResponse.json(snap, { status: 201 })
})
