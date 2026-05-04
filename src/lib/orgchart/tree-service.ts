import { prisma } from '@/lib/prisma'
import { insertClosureForNewUnit, isDescendantOf, moveSubtree } from './closure-maintenance'
import type { OrgChartTree, OrgUnitDTO, OrgPositionDTO, OrgAssignmentDTO, OrgComplianceRoleDTO } from './types'

/**
 * Servicio del árbol del organigrama.
 *
 * Multi-tenant estricto: TODAS las queries filtran por orgId.
 * Optimistic locking via OrgUnit.version (rechaza writes con version desactualizada).
 */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function getTree(orgId: string, asOf?: Date | null): Promise<OrgChartTree> {
  const effectiveAt = asOf ?? new Date()
  const temporalWhere = {
    validFrom: { lte: effectiveAt },
    OR: [{ validTo: null }, { validTo: { gt: effectiveAt } }],
  }
  const assignmentTemporalWhere = {
    startedAt: { lte: effectiveAt },
    OR: [{ endedAt: null }, { endedAt: { gt: effectiveAt } }],
  }

  const [units, positions, assignments, complianceRoles] = await Promise.all([
    prisma.orgUnit.findMany({
      where: { orgId, isActive: true, ...temporalWhere },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.orgPosition.findMany({
      where: { orgId, ...temporalWhere },
      orderBy: [{ title: 'asc' }],
    }),
    prisma.orgAssignment.findMany({
      where: { orgId, ...assignmentTemporalWhere },
      include: {
        worker: {
          select: {
            id: true,
            dni: true,
            email: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            position: true,
            department: true,
            regimenLaboral: true,
            tipoContrato: true,
            fechaIngreso: true,
            legajoScore: true,
            status: true,
          },
        },
      },
    }),
    prisma.orgComplianceRole.findMany({
      where: {
        orgId,
        startsAt: { lte: effectiveAt },
        OR: [{ endsAt: null }, { endsAt: { gt: effectiveAt } }],
      },
      include: {
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ])

  return {
    rootUnitIds: units.filter(u => !u.parentId).map(u => u.id),
    units: units.map(toUnitDTO),
    positions: positions.map(toPositionDTO),
    assignments: assignments.map(toAssignmentDTO),
    complianceRoles: complianceRoles.map(toComplianceRoleDTO),
    generatedAt: new Date().toISOString(),
    asOf: asOf ? asOf.toISOString() : null,
  }
}

export async function createUnit(
  orgId: string,
  input: {
    name: string
    kind?: 'GERENCIA' | 'AREA' | 'DEPARTAMENTO' | 'EQUIPO' | 'COMITE_LEGAL' | 'BRIGADA' | 'PROYECTO'
    parentId?: string | null
    code?: string | null
    description?: string | null
    costCenter?: string | null
    color?: string | null
    icon?: string | null
    sortOrder?: number
  },
) {
  // si hay parentId, validar que pertenezca a la misma org y calcular level
  let level = 0
  if (input.parentId) {
    const parent = await prisma.orgUnit.findFirst({
      where: { id: input.parentId, orgId, isActive: true, validTo: null },
      select: { level: true },
    })
    if (!parent) throw new Error('Unidad padre no existe en esta organización')
    level = parent.level + 1
  }

  const baseSlug = slugify(input.name)
  const slug = await uniqueSlug(orgId, baseSlug)

  const unit = await prisma.orgUnit.create({
    data: {
      orgId,
      parentId: input.parentId ?? null,
      name: input.name,
      slug,
      kind: input.kind ?? 'AREA',
      code: input.code ?? null,
      description: input.description ?? null,
      costCenter: input.costCenter ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      sortOrder: input.sortOrder ?? 0,
      level,
    },
  })

  await insertClosureForNewUnit(unit.id, input.parentId ?? null)
  return unit
}

export async function updateUnit(
  orgId: string,
  unitId: string,
  patch: Partial<{
    name: string
    description: string | null
    code: string | null
    costCenter: string | null
    color: string | null
    icon: string | null
    sortOrder: number
    kind: 'GERENCIA' | 'AREA' | 'DEPARTAMENTO' | 'EQUIPO' | 'COMITE_LEGAL' | 'BRIGADA' | 'PROYECTO'
  }>,
  ifMatchVersion?: number,
) {
  const current = await prisma.orgUnit.findFirst({ where: { id: unitId, orgId } })
  if (!current) throw new Error('Unidad no existe')
  if (ifMatchVersion !== undefined && current.version !== ifMatchVersion) {
    throw new Error('Versión desactualizada — recarga el organigrama')
  }
  return prisma.orgUnit.update({
    where: { id: unitId },
    data: { ...patch, version: { increment: 1 } },
  })
}

export async function moveUnit(
  orgId: string,
  unitId: string,
  newParentId: string | null,
  ifMatchVersion?: number,
) {
  const current = await prisma.orgUnit.findFirst({ where: { id: unitId, orgId } })
  if (!current) throw new Error('Unidad no existe')
  if (ifMatchVersion !== undefined && current.version !== ifMatchVersion) {
    throw new Error('Versión desactualizada — recarga el organigrama')
  }

  if (newParentId) {
    if (newParentId === unitId) {
      throw new Error('Una unidad no puede ser su propia padre')
    }
    const isCycle = await isDescendantOf(unitId, newParentId)
    if (isCycle) {
      throw new Error('No se puede mover: el destino es descendiente de la unidad')
    }
    const parent = await prisma.orgUnit.findFirst({
      where: { id: newParentId, orgId, isActive: true, validTo: null },
      select: { id: true, level: true },
    })
    if (!parent) throw new Error('Unidad padre destino no existe')
  }

  const parentLevel = newParentId
    ? (
        await prisma.orgUnit.findUnique({ where: { id: newParentId }, select: { level: true } })
      )?.level ?? -1
    : -1
  const nextRootLevel = parentLevel + 1
  await moveSubtree(unitId, newParentId)
  await updateSubtreeLevels(unitId, nextRootLevel)
  return prisma.orgUnit.update({
    where: { id: unitId },
    data: {
      parentId: newParentId,
      version: { increment: 1 },
      level: nextRootLevel,
    },
  })
}

export async function deleteUnit(orgId: string, unitId: string) {
  const current = await prisma.orgUnit.findFirst({
    where: { id: unitId, orgId },
    include: {
      children: { where: { isActive: true, validTo: null }, select: { id: true } },
      positions: { where: { validTo: null }, select: { id: true } },
    },
  })
  if (!current) throw new Error('Unidad no existe')
  if (current.children.length > 0) {
    throw new Error('Mueve o elimina primero las sub-unidades hijas')
  }
  if (current.positions.length > 0) {
    throw new Error('La unidad tiene cargos. Reasígnalos antes de eliminar.')
  }
  await prisma.orgUnit.update({
    where: { id: unitId },
    data: { isActive: false, validTo: new Date(), version: { increment: 1 } },
  })
}

async function uniqueSlug(orgId: string, base: string): Promise<string> {
  const root = base || 'unidad'
  let candidate = root
  let n = 1
  while (
    await prisma.orgUnit.findUnique({ where: { orgId_slug: { orgId, slug: candidate } } })
  ) {
    n++
    candidate = `${root}-${n}`
  }
  return candidate
}

async function updateSubtreeLevels(unitId: string, rootLevel: number) {
  const subtree = await prisma.orgUnitClosure.findMany({
    where: { ancestorId: unitId },
    select: { descendantId: true, depth: true },
  })

  await Promise.all(
    subtree
      .filter(row => row.depth > 0)
      .map(row =>
        prisma.orgUnit.update({
          where: { id: row.descendantId },
          data: { level: rootLevel + row.depth },
        }),
      ),
  )
}

// ─── DTO mappers ─────────────────────────────────────────────────────────────

type UnitRow = Awaited<ReturnType<typeof prisma.orgUnit.findFirstOrThrow>>
type PositionRow = Awaited<ReturnType<typeof prisma.orgPosition.findFirstOrThrow>>
type AssignmentRow = Awaited<ReturnType<typeof prisma.orgAssignment.findFirst>> & {
  worker: {
    id: string
    dni: string
    email: string | null
    firstName: string
    lastName: string
    photoUrl: string | null
    position: string | null
    department: string | null
    regimenLaboral: string
    tipoContrato: string
    fechaIngreso: Date
    legajoScore: number | null
    status: string
  }
}
type ComplianceRoleRow = Awaited<ReturnType<typeof prisma.orgComplianceRole.findFirst>> & {
  worker: { id: string; firstName: string; lastName: string }
}

function toUnitDTO(u: UnitRow): OrgUnitDTO {
  return {
    id: u.id,
    parentId: u.parentId,
    name: u.name,
    slug: u.slug,
    kind: u.kind,
    code: u.code,
    description: u.description,
    costCenter: u.costCenter,
    level: u.level,
    sortOrder: u.sortOrder,
    color: u.color,
    icon: u.icon,
    version: u.version,
    isActive: u.isActive,
    validFrom: u.validFrom.toISOString(),
    validTo: u.validTo?.toISOString() ?? null,
  }
}

function toPositionDTO(p: PositionRow): OrgPositionDTO {
  return {
    id: p.id,
    orgUnitId: p.orgUnitId,
    title: p.title,
    code: p.code,
    description: p.description,
    level: p.level,
    purpose: p.purpose,
    functions: p.functions,
    responsibilities: p.responsibilities,
    requirements: p.requirements,
    salaryBandMin: p.salaryBandMin?.toString() ?? null,
    salaryBandMax: p.salaryBandMax?.toString() ?? null,
    category: p.category,
    riskCategory: p.riskCategory,
    requiresSctr: p.requiresSctr,
    requiresMedicalExam: p.requiresMedicalExam,
    isCritical: p.isCritical,
    isManagerial: p.isManagerial,
    reportsToPositionId: p.reportsToPositionId,
    backupPositionId: p.backupPositionId,
    seats: p.seats,
    validFrom: p.validFrom.toISOString(),
    validTo: p.validTo?.toISOString() ?? null,
  }
}

function toAssignmentDTO(a: AssignmentRow): OrgAssignmentDTO {
  return {
    id: a!.id,
    workerId: a!.workerId,
    positionId: a!.positionId,
    isPrimary: a!.isPrimary,
    isInterim: a!.isInterim,
    startedAt: a!.startedAt.toISOString(),
    endedAt: a!.endedAt ? a!.endedAt.toISOString() : null,
    capacityPct: a!.capacityPct,
    worker: {
      ...a.worker,
      fechaIngreso: a.worker.fechaIngreso.toISOString(),
    },
  }
}

function toComplianceRoleDTO(r: ComplianceRoleRow): OrgComplianceRoleDTO {
  return {
    id: r!.id,
    workerId: r!.workerId,
    roleType: r!.roleType,
    unitId: r!.unitId,
    startsAt: r!.startsAt.toISOString(),
    endsAt: r!.endsAt ? r!.endsAt.toISOString() : null,
    electedAt: r!.electedAt ? r!.electedAt.toISOString() : null,
    actaUrl: r!.actaUrl,
    baseLegal: r!.baseLegal,
    worker: r.worker,
  }
}
