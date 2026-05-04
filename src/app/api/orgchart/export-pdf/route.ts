import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { exportOrgChartPdf } from '@/lib/orgchart/export-pdf'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const snapshotId = req.nextUrl.searchParams.get('snapshotId')
  const asOfStr = req.nextUrl.searchParams.get('asOf')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && Number.isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf inválido' }, { status: 400 })
  }

  try {
    const snapshotExport = snapshotId ? await getVerifiedSnapshotTree(ctx.orgId, snapshotId) : null
    const result = await exportOrgChartPdf(
      ctx.orgId,
      snapshotExport?.snapshot.createdAt ?? asOf,
      snapshotExport?.tree,
    )

    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.export_pdf',
        metadataJson: {
          fileName: result.fileName,
          asOf: snapshotExport?.snapshot.createdAt.toISOString() ?? asOf?.toISOString() ?? null,
          snapshotId: snapshotExport?.snapshot.id ?? null,
          snapshotHash: snapshotExport?.snapshot.hash ?? null,
        } as object,
      },
    }).catch(() => {})

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof OrgChartSnapshotNotFoundError) {
      return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
    }
    if (error instanceof OrgChartSnapshotIntegrityError) {
      return NextResponse.json({ error: 'Snapshot alterado o corrupto' }, { status: 409 })
    }
    throw error
  }
})
