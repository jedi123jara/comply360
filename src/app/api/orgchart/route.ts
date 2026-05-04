import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { getTree } from '@/lib/orgchart/tree-service'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'

export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const snapshotId = searchParams.get('snapshotId')
  if (snapshotId) {
    try {
      const { tree } = await getVerifiedSnapshotTree(ctx.orgId, snapshotId)
      return NextResponse.json(tree)
    } catch (error) {
      if (error instanceof OrgChartSnapshotNotFoundError) {
        return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
      }
      if (error instanceof OrgChartSnapshotIntegrityError) {
        return NextResponse.json({ error: 'Snapshot alterado o corrupto' }, { status: 409 })
      }
      throw error
    }
  }

  const asOfStr = searchParams.get('asOf')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf inválido' }, { status: 400 })
  }
  const tree = await getTree(ctx.orgId, asOf)
  return NextResponse.json(tree)
})
