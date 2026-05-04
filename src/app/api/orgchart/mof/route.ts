import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  generateOrgChartMofDocx,
  MofOrganizationNotFoundError,
  MofUnitNotFoundError,
} from '@/lib/orgchart/mof-docx'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const snapshotId = req.nextUrl.searchParams.get('snapshotId')
  const asOfStr = req.nextUrl.searchParams.get('asOf')
  const unitId = req.nextUrl.searchParams.get('unitId')
  const asOf = asOfStr ? new Date(asOfStr) : null
  if (asOfStr && Number.isNaN(asOf!.getTime())) {
    return NextResponse.json({ error: 'asOf invalido' }, { status: 400 })
  }

  try {
    const snapshotExport = snapshotId ? await getVerifiedSnapshotTree(ctx.orgId, snapshotId) : null
    const doc = await generateOrgChartMofDocx(ctx.orgId, {
      asOf: snapshotExport?.snapshot.createdAt ?? asOf,
      unitId,
      tree: snapshotExport?.tree,
    })

    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.mof_downloaded',
        entityType: unitId ? 'OrgUnit' : 'OrgChart',
        entityId: unitId ?? undefined,
        metadataJson: {
          fileName: doc.fileName,
          asOf: doc.asOf,
          unitId: doc.unitId,
          positionCount: doc.positionCount,
          missingMofCount: doc.missingMofCount,
          snapshotId: snapshotExport?.snapshot.id ?? null,
          snapshotHash: snapshotExport?.snapshot.hash ?? null,
        } as object,
      },
    }).catch(() => {})

    return new NextResponse(new Uint8Array(doc.buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${doc.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof MofOrganizationNotFoundError) {
      return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
    }
    if (error instanceof MofUnitNotFoundError) {
      return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 })
    }
    if (error instanceof OrgChartSnapshotNotFoundError) {
      return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
    }
    if (error instanceof OrgChartSnapshotIntegrityError) {
      return NextResponse.json({ error: 'Snapshot alterado o corrupto' }, { status: 409 })
    }
    throw error
  }
})
