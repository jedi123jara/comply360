import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/api-auth'
import { getTree } from '@/lib/orgchart/tree-service'
import { auditLog, auditContext } from '@/lib/audit'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'

export const dynamic = 'force-dynamic'

export const GET = withPermission('ORGCHART_VIEW', async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const snapshotId = searchParams.get('snapshotId')
  
  if (snapshotId) {
    try {
      const { tree } = await getVerifiedSnapshotTree(ctx.orgId, snapshotId)
      await auditLog({
        ...auditContext(req, ctx),
        action: 'orgchart.snapshot_viewed',
        resourceType: 'OrgChartSnapshot',
        resourceId: snapshotId,
      })
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
  
  await auditLog({
    ...auditContext(req, ctx),
    action: 'orgchart.viewed',
    resourceType: 'Organization',
    resourceId: ctx.orgId,
    details: { asOf: asOf?.toISOString() },
  })
  
  return NextResponse.json(tree)
})
