/**
 * GET /api/orgchart/snapshots/diff/narrative?fromId=&toId=
 *
 * Genera la narrativa "Esta semana en tu organización" entre dos snapshots.
 */
import { NextRequest, NextResponse } from 'next/server'

import { withRole } from '@/lib/api-auth'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'
import {
  buildNarrativeInputFromTrees,
  generateTimeMachineNarrative,
} from '@/lib/orgchart/time-machine-narrative'

export const runtime = 'nodejs'
export const maxDuration = 30

export const GET = withRole('MEMBER', async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const fromId = sp.get('fromId')
  const toId = sp.get('toId')

  if (!fromId || !toId) {
    return NextResponse.json(
      { error: 'fromId y toId son requeridos' },
      { status: 400 },
    )
  }

  try {
    const [from, to] = await Promise.all([
      getVerifiedSnapshotTree(ctx.orgId, fromId),
      getVerifiedSnapshotTree(ctx.orgId, toId),
    ])

    const input = buildNarrativeInputFromTrees(
      from.tree,
      to.tree,
      { label: from.snapshot.label, createdAt: from.snapshot.createdAt },
      { label: to.snapshot.label, createdAt: to.snapshot.createdAt },
    )
    const result = await generateTimeMachineNarrative(input)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
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
      { error: err instanceof Error ? err.message : 'Error generando narrativa' },
      { status: 500 },
    )
  }
})
