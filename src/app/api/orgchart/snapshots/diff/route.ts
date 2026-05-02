import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { diffSnapshots, getSnapshot, hashSnapshotPayload } from '@/lib/orgchart/snapshot-service'
import { getTree } from '@/lib/orgchart/tree-service'
import type { OrgChartTree } from '@/lib/orgchart/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SnapshotPayload = Partial<OrgChartTree>

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const fromId = req.nextUrl.searchParams.get('from') ?? req.nextUrl.searchParams.get('fromId')
  const toId = req.nextUrl.searchParams.get('to') ?? req.nextUrl.searchParams.get('toId') ?? 'current'

  if (!fromId) {
    return NextResponse.json({ error: 'Debe indicar el snapshot origen con ?from=' }, { status: 400 })
  }

  const fromSnapshot = await getSnapshot(ctx.orgId, fromId)
  if (!fromSnapshot) {
    return NextResponse.json({ error: 'Snapshot origen no encontrado' }, { status: 404 })
  }

  const fromPayload = fromSnapshot.payload as unknown as SnapshotPayload
  const fromMeta = {
    id: fromSnapshot.id,
    label: fromSnapshot.label,
    createdAt: fromSnapshot.createdAt.toISOString(),
    hash: fromSnapshot.hash,
  }

  const toPayload =
    toId === 'current'
      ? await getTree(ctx.orgId)
      : ((await getSnapshot(ctx.orgId, toId))?.payload as unknown as SnapshotPayload | undefined)

  if (!toPayload) {
    return NextResponse.json({ error: 'Snapshot destino no encontrado' }, { status: 404 })
  }

  const toMeta =
    toId === 'current'
      ? {
          id: 'current',
          label: 'Estado actual',
          createdAt: new Date().toISOString(),
          hash: hashSnapshotPayload(toPayload),
        }
      : await snapshotMeta(ctx.orgId, toId)

  if (!toMeta) {
    return NextResponse.json({ error: 'Snapshot destino no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    from: fromMeta,
    to: toMeta,
    diff: diffSnapshots(fromPayload, toPayload),
  })
})

async function snapshotMeta(orgId: string, snapshotId: string) {
  const snapshot = await getSnapshot(orgId, snapshotId)
  if (!snapshot) return null
  return {
    id: snapshot.id,
    label: snapshot.label,
    createdAt: snapshot.createdAt.toISOString(),
    hash: snapshot.hash,
  }
}
