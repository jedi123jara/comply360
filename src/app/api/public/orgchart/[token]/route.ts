import { NextRequest, NextResponse } from 'next/server'
import { verifyAuditorToken } from '@/lib/orgchart/public-link/token'
import { hashSnapshotPayload } from '@/lib/orgchart/snapshot-service'
import { prisma } from '@/lib/prisma'
import type { OrgChartTree, PublicOrgChartPayload } from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  const decoded = verifyAuditorToken(token)
  if (!decoded) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 401 })
  }

  const orgId = decoded.aud
  const snap = await prisma.orgChartSnapshot.findFirst({
    where: { id: decoded.sub, orgId },
  })
  if (!snap) {
    return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
  }
  if (snap.hash !== decoded.hash) {
    return NextResponse.json({ error: 'El snapshot fue modificado — enlace inválido' }, { status: 409 })
  }
  const recomputedHash = hashSnapshotPayload(snap.payload as Partial<OrgChartTree>)
  if (recomputedHash !== snap.hash) {
    return NextResponse.json({ error: 'El payload del snapshot no coincide con su hash' }, { status: 409 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, ruc: true, razonSocial: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organización no existe' }, { status: 404 })
  }

  const payload = snap.payload as unknown as {
    units: Array<{ id: string; parentId: string | null; name: string; kind: PublicOrgChartPayload['units'][number]['kind'] }>
    positions: Array<{ id: string; orgUnitId: string; title: string }>
    assignments: Array<{
      positionId: string
      isInterim: boolean
      worker: { firstName: string; lastName: string }
    }>
    complianceRoles: Array<{
      roleType: PublicOrgChartPayload['complianceRoles'][number]['roleType']
      worker: { firstName: string; lastName: string }
      unitId: string | null
      endsAt: string | null
    }>
  }

  // Construir vista pública redactada (sin sueldos, sin DNI, sin contacto)
  const positionsWithOccupants = payload.positions.map(p => ({
    id: p.id,
    orgUnitId: p.orgUnitId,
    title: p.title,
    occupants: decoded.includeWorkers
      ? payload.assignments
          .filter(a => a.positionId === p.id)
          .map(a => ({
            name: `${a.worker.firstName} ${a.worker.lastName}`,
            isInterim: a.isInterim,
          }))
      : [],
  }))

  const complianceRoles = decoded.includeComplianceRoles
    ? payload.complianceRoles.map(r => ({
        roleType: r.roleType,
        workerName: `${r.worker.firstName} ${r.worker.lastName}`,
        unitId: r.unitId,
        endsAt: r.endsAt,
      }))
    : []

  const response: PublicOrgChartPayload & { roleCatalog: typeof COMPLIANCE_ROLES } = {
    org: { name: org.razonSocial ?? org.name, ruc: org.ruc },
    snapshotLabel: snap.label,
    takenAt: snap.createdAt.toISOString(),
    hashShort: snap.hash.slice(0, 12),
    units: payload.units,
    positions: positionsWithOccupants,
    complianceRoles,
    roleCatalog: COMPLIANCE_ROLES,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
