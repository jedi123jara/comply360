/**
 * GET /api/orgchart/snapshots/[id]/thumbnail.svg
 *
 * Devuelve un thumbnail SVG (400×120) del organigrama del snapshot, para
 * usar en las tarjetas del Time Machine.
 *
 * El SVG se cachea agresivamente (immutable) — los snapshots son immutable
 * por diseño (su hash garantiza integridad).
 */
import { NextRequest, NextResponse } from 'next/server'

import { withRoleParams } from '@/lib/api-auth'
import { renderSnapshotThumbnailSVG } from '@/lib/orgchart/snapshot-thumbnail'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'
import { runOrgDoctor } from '@/lib/orgchart/org-doctor'
import { buildCoverageReport } from '@/lib/orgchart/coverage-aggregator'

export const runtime = 'nodejs'

export const GET = withRoleParams<{ id: string }>('MEMBER', async (_req: NextRequest, ctx, params) => {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'snapshotId requerido' }, { status: 400 })
  }

  try {
    const verified = await getVerifiedSnapshotTree(ctx.orgId, id)
    // Coverage es opcional — si falla, dibujamos sin colores
    let coverage = null
    try {
      const doctorReport = await runOrgDoctor(ctx.orgId)
      coverage = buildCoverageReport(verified.tree, doctorReport.findings)
    } catch {
      coverage = null
    }
    const svg = renderSnapshotThumbnailSVG(verified.tree, coverage)
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    if (err instanceof OrgChartSnapshotNotFoundError) {
      return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
    }
    if (err instanceof OrgChartSnapshotIntegrityError) {
      return NextResponse.json({ error: 'Snapshot alterado' }, { status: 409 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando thumbnail' },
      { status: 500 },
    )
  }
})
