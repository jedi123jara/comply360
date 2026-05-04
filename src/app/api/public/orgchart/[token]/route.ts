import { NextRequest, NextResponse } from 'next/server'
import { verifyAuditorToken } from '@/lib/orgchart/public-link/token'
import {
  getVerifiedSnapshotTree,
  OrgChartSnapshotIntegrityError,
  OrgChartSnapshotNotFoundError,
} from '@/lib/orgchart/snapshot-service'
import { prisma } from '@/lib/prisma'
import type { PublicOrgChartPayload } from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import { buildGuidedTour, type GuidedTour } from '@/lib/orgchart/public-link/guided-tour'

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
  let verified: Awaited<ReturnType<typeof getVerifiedSnapshotTree>>
  try {
    verified = await getVerifiedSnapshotTree(orgId, decoded.sub)
  } catch (error) {
    if (error instanceof OrgChartSnapshotNotFoundError) {
      return NextResponse.json({ error: 'Snapshot no encontrado' }, { status: 404 })
    }
    if (error instanceof OrgChartSnapshotIntegrityError) {
      return NextResponse.json({ error: 'El payload del snapshot no coincide con su hash' }, { status: 409 })
    }
    throw error
  }
  if (verified.snapshot.hash !== decoded.hash) {
    return NextResponse.json({ error: 'El snapshot fue modificado — enlace inválido' }, { status: 409 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, ruc: true, razonSocial: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organización no existe' }, { status: 404 })
  }

  const tree = verified.tree

  // Construir vista pública redactada (sin sueldos, sin DNI, sin contacto)
  const positionsWithOccupants = tree.positions.map(p => ({
    id: p.id,
    orgUnitId: p.orgUnitId,
    title: p.title,
    occupants: decoded.includeWorkers
      ? tree.assignments
          .filter(a => a.positionId === p.id)
          .map(a => ({
            name: `${a.worker.firstName} ${a.worker.lastName}`,
            isInterim: a.isInterim,
          }))
      : [],
  }))

  const complianceRoles = decoded.includeComplianceRoles
    ? tree.complianceRoles.map(r => ({
        roleType: r.roleType,
        workerName: `${r.worker.firstName} ${r.worker.lastName}`,
        unitId: r.unitId,
        endsAt: r.endsAt,
      }))
    : []

  // MOF coverage ratio — para el step #6 del tour guiado.
  const mofCompletedCount = tree.positions.filter(
    (p) => Boolean(p.purpose && p.functions && p.responsibilities && p.requirements),
  ).length
  const mofCompletedRatio =
    tree.positions.length === 0 ? 1 : mofCompletedCount / tree.positions.length

  // Worker count del snapshot (para reglas de "≥20 trabajadores → comité formal").
  // Contamos workers únicos asignados — el snapshot meta no expone workerCount
  // directo, así que derivamos del tree.
  const workerCount = new Set(tree.assignments.map((a) => a.workerId)).size

  // Tour guiado modo Inspector SUNAFIL — solo si el token incluye complianceRoles
  // (sin roles, el tour pierde su valor).
  const guidedTour: GuidedTour | null = decoded.includeComplianceRoles
    ? buildGuidedTour(
        {
          units: tree.units.map((u) => ({
            id: u.id,
            parentId: u.parentId,
            name: u.name,
            kind: u.kind,
          })),
          positions: positionsWithOccupants,
          complianceRoles,
        },
        { workerCount, mofCompletedRatio },
      )
    : null

  const response: PublicOrgChartPayload & {
    roleCatalog: typeof COMPLIANCE_ROLES
    guidedTour: GuidedTour | null
  } = {
    org: { name: org.razonSocial ?? org.name, ruc: org.ruc },
    snapshotLabel: verified.snapshot.label,
    takenAt: verified.snapshot.createdAt.toISOString(),
    hash: verified.snapshot.hash,
    hashShort: verified.snapshot.hash.slice(0, 12),
    units: tree.units.map(unit => ({
      id: unit.id,
      parentId: unit.parentId,
      name: unit.name,
      kind: unit.kind,
    })),
    positions: positionsWithOccupants,
    complianceRoles,
    roleCatalog: COMPLIANCE_ROLES,
    guidedTour,
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
