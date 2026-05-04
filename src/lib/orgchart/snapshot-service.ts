import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getTree } from './tree-service'
import { recordStructureChange } from './change-log'
import type { OrgChartTree } from './types'

/**
 * Snapshots del organigrama para time travel y auditorías SUNAFIL.
 *
 * Cada snapshot guarda:
 *   - Payload completo del árbol al momento (Json)
 *   - Hash sha256 del payload (canonicalizado) — si se altera, queda evidente
 *   - workerCount, unitCount, depthMax para mostrar resumen rápido
 *
 * El hash es la "firma" del snapshot. La página pública del Auditor Link lo
 * verifica al renderizar.
 */

export async function takeSnapshot(
  orgId: string,
  opts: { label: string; reason?: string | null; takenById?: string | null; isAuto?: boolean },
) {
  const tree = await getTree(orgId)
  const { hash, depthMax, unitCount, workerCount } = computeSnapshotMetrics(tree)

  // si ya existe snapshot con mismo hash, no duplicar — devolver el existente
  const existing = await prisma.orgChartSnapshot.findUnique({
    where: { orgId_hash: { orgId, hash } },
  })
  if (existing) return existing

  const snapshot = await prisma.orgChartSnapshot.create({
    data: {
      orgId,
      label: opts.label,
      reason: opts.reason ?? null,
      takenById: opts.takenById ?? null,
      payload: tree as unknown as object,
      workerCount,
      unitCount,
      depthMax,
      hash,
      isAuto: !!opts.isAuto,
    },
  })

  await recordStructureChange({
    orgId,
    type: 'SNAPSHOT_CREATE',
    entityType: 'OrgChartSnapshot',
    entityId: snapshot.id,
    afterJson: {
      id: snapshot.id,
      label: snapshot.label,
      hash: snapshot.hash,
      workerCount: snapshot.workerCount,
      unitCount: snapshot.unitCount,
      depthMax: snapshot.depthMax,
      isAuto: snapshot.isAuto,
    },
    performedById: opts.takenById ?? null,
    reason: opts.reason ?? null,
  }).catch(() => {})

  return snapshot
}

export async function listSnapshots(orgId: string, limit = 50) {
  return prisma.orgChartSnapshot.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      label: true,
      reason: true,
      workerCount: true,
      unitCount: true,
      depthMax: true,
      hash: true,
      isAuto: true,
      createdAt: true,
    },
  })
}

export async function getSnapshot(orgId: string, snapshotId: string) {
  return prisma.orgChartSnapshot.findFirst({
    where: { id: snapshotId, orgId },
  })
}

export class OrgChartSnapshotNotFoundError extends Error {
  constructor() {
    super('Snapshot no encontrado')
  }
}

export class OrgChartSnapshotIntegrityError extends Error {
  constructor() {
    super('Snapshot alterado o corrupto')
  }
}

export async function getVerifiedSnapshotTree(orgId: string, snapshotId: string) {
  const snapshot = await getSnapshot(orgId, snapshotId)
  if (!snapshot) throw new OrgChartSnapshotNotFoundError()

  const payload = snapshot.payload as Partial<OrgChartTree>
  const computedHash = hashSnapshotPayload(payload)
  if (computedHash !== snapshot.hash) {
    throw new OrgChartSnapshotIntegrityError()
  }

  return {
    snapshot: {
      id: snapshot.id,
      label: snapshot.label,
      reason: snapshot.reason,
      hash: snapshot.hash,
      createdAt: snapshot.createdAt,
      isAuto: snapshot.isAuto,
    },
    tree: coerceSnapshotTree(payload, snapshot.createdAt),
  }
}

export function computeSnapshotMetrics(tree: Pick<OrgChartTree, 'units' | 'assignments'> & Partial<OrgChartTree>) {
  const canonical = canonicalizeSnapshotPayload(tree)
  const hash = createHash('sha256').update(canonical).digest('hex')
  const depthMax = tree.units.reduce((m, u) => Math.max(m, u.level), 0)
  const workerIds = new Set(
    tree.assignments
      .map(a => (typeof a === 'object' && a !== null && 'workerId' in a ? String(a.workerId) : null))
      .filter(Boolean),
  )
  return {
    hash,
    depthMax,
    unitCount: tree.units.length,
    workerCount: workerIds.size || tree.assignments.length,
  }
}

export function hashSnapshotPayload(payload: Partial<OrgChartTree>) {
  return createHash('sha256').update(canonicalizeSnapshotPayload(payload)).digest('hex')
}

export function canonicalizeSnapshotPayload(payload: Partial<OrgChartTree>) {
  const canonicalPayload = {
    units: sortedById(payload.units ?? []),
    positions: sortedById(payload.positions ?? []),
    assignments: sortedById(payload.assignments ?? []),
    complianceRoles: sortedById(payload.complianceRoles ?? []),
  }
  return stableStringify(canonicalPayload)
}

function sortedById<T extends { id?: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''))
}

function coerceSnapshotTree(payload: Partial<OrgChartTree>, createdAt: Date): OrgChartTree {
  const units = Array.isArray(payload.units) ? payload.units : []
  const rootUnitIds = Array.isArray(payload.rootUnitIds)
    ? payload.rootUnitIds
    : units.filter(unit => !unit.parentId).map(unit => unit.id)

  return {
    rootUnitIds,
    units,
    positions: Array.isArray(payload.positions) ? payload.positions : [],
    assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
    complianceRoles: Array.isArray(payload.complianceRoles) ? payload.complianceRoles : [],
    generatedAt: createdAt.toISOString(),
    asOf: createdAt.toISOString(),
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

type SnapshotUnit = {
  id: string
  name?: string | null
  parentId?: string | null
  kind?: string | null
  code?: string | null
  description?: string | null
  costCenter?: string | null
  level?: number | null
  sortOrder?: number | null
  color?: string | null
  icon?: string | null
  isActive?: boolean | null
  validFrom?: string | null
  validTo?: string | null
}

type SnapshotPosition = {
  id: string
  orgUnitId?: string | null
  title?: string | null
  code?: string | null
  description?: string | null
  level?: string | null
  purpose?: string | null
  functions?: unknown
  responsibilities?: unknown
  requirements?: unknown
  category?: string | null
  riskCategory?: string | null
  requiresSctr?: boolean | null
  requiresMedicalExam?: boolean | null
  isCritical?: boolean | null
  isManagerial?: boolean | null
  reportsToPositionId?: string | null
  backupPositionId?: string | null
  seats?: number | null
  validFrom?: string | null
  validTo?: string | null
}

type SnapshotAssignment = {
  id?: string
  workerId: string
  positionId: string
  isPrimary?: boolean
  endedAt?: string | null
  worker?: {
    id?: string
    dni?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  }
}

type SnapshotComplianceRole = {
  id?: string
  workerId?: string
  roleType?: string
  unitId?: string | null
  endsAt?: string | null
  worker?: {
    firstName?: string | null
    lastName?: string | null
  }
}

type SnapshotDiffInput = {
  units?: SnapshotUnit[]
  positions?: SnapshotPosition[]
  assignments?: SnapshotAssignment[]
  complianceRoles?: SnapshotComplianceRole[]
}

const UNIT_DIFF_FIELDS = [
  'name',
  'parentId',
  'kind',
  'code',
  'description',
  'costCenter',
  'level',
  'sortOrder',
  'color',
  'icon',
  'isActive',
  'validFrom',
  'validTo',
] as const

const POSITION_DIFF_FIELDS = [
  'orgUnitId',
  'title',
  'code',
  'description',
  'level',
  'purpose',
  'functions',
  'responsibilities',
  'requirements',
  'category',
  'riskCategory',
  'requiresSctr',
  'requiresMedicalExam',
  'isCritical',
  'isManagerial',
  'reportsToPositionId',
  'backupPositionId',
  'seats',
  'validFrom',
  'validTo',
] as const

/** Compara dos payloads de snapshot y devuelve un resumen estructural. */
export function diffSnapshots(
  before: SnapshotDiffInput,
  after: SnapshotDiffInput,
) {
  const beforeUnits = before.units ?? []
  const afterUnits = after.units ?? []
  const beforePositions = before.positions ?? []
  const afterPositions = after.positions ?? []
  const beforeAssignments = before.assignments ?? []
  const afterAssignments = after.assignments ?? []
  const beforeComplianceRoles = before.complianceRoles ?? []
  const afterComplianceRoles = after.complianceRoles ?? []

  const beforeUnitIds = new Set(beforeUnits.map(u => u.id))
  const afterUnitIds = new Set(afterUnits.map(u => u.id))
  const addedUnits = afterUnits.filter(u => !beforeUnitIds.has(u.id))
  const removedUnits = beforeUnits.filter(u => !afterUnitIds.has(u.id))
  const changedUnits = changedByFields(beforeUnits, afterUnits, UNIT_DIFF_FIELDS)

  const beforePositionIds = new Set(beforePositions.map(position => position.id))
  const afterPositionIds = new Set(afterPositions.map(position => position.id))
  const addedPositions = afterPositions.filter(position => !beforePositionIds.has(position.id))
  const removedPositions = beforePositions.filter(position => !afterPositionIds.has(position.id))
  const changedPositions = changedByFields(beforePositions, afterPositions, POSITION_DIFF_FIELDS)
  const movedPositions = changedPositions.filter(change =>
    change.changedFields.some(field => field === 'reportsToPositionId' || field === 'orgUnitId'),
  )

  const beforeAssignKeys = new Set(beforeAssignments.map(assignmentKey))
  const afterAssignKeys = new Set(afterAssignments.map(assignmentKey))
  const addedAssignments = afterAssignments.filter(
    a => !beforeAssignKeys.has(`${a.workerId}::${a.positionId}`),
  )
  const removedAssignments = beforeAssignments.filter(
    a => !afterAssignKeys.has(`${a.workerId}::${a.positionId}`),
  )
  const reassignedWorkers = detectReassignedWorkers(beforeAssignments, afterAssignments)

  const beforeRoleKeys = new Set(beforeComplianceRoles.map(complianceRoleKey))
  const afterRoleKeys = new Set(afterComplianceRoles.map(complianceRoleKey))
  const addedComplianceRoles = afterComplianceRoles.filter(role => !beforeRoleKeys.has(complianceRoleKey(role)))
  const removedComplianceRoles = beforeComplianceRoles.filter(role => !afterRoleKeys.has(complianceRoleKey(role)))

  const totals = {
    addedUnits: addedUnits.length,
    removedUnits: removedUnits.length,
    changedUnits: changedUnits.length,
    addedPositions: addedPositions.length,
    removedPositions: removedPositions.length,
    changedPositions: changedPositions.length,
    movedPositions: movedPositions.length,
    addedAssignments: addedAssignments.length,
    removedAssignments: removedAssignments.length,
    reassignedWorkers: reassignedWorkers.length,
    addedComplianceRoles: addedComplianceRoles.length,
    removedComplianceRoles: removedComplianceRoles.length,
  }

  return {
    addedUnits,
    removedUnits,
    changedUnits,
    addedPositions,
    removedPositions,
    changedPositions,
    movedPositions,
    addedAssignments,
    removedAssignments,
    reassignedWorkers,
    addedComplianceRoles,
    removedComplianceRoles,
    totals,
  }
}

function assignmentKey(assignment: SnapshotAssignment) {
  return `${assignment.workerId}::${assignment.positionId}`
}

function complianceRoleKey(role: SnapshotComplianceRole) {
  return role.id ?? `${role.roleType ?? 'ROLE'}::${role.workerId ?? 'worker'}::${role.unitId ?? 'global'}`
}

function changedByFields<T extends { id: string }>(
  beforeItems: T[],
  afterItems: T[],
  fields: readonly string[],
) {
  const beforeById = new Map(beforeItems.map(item => [item.id, item]))
  return afterItems.flatMap(afterItem => {
    const beforeItem = beforeById.get(afterItem.id)
    if (!beforeItem) return []

    const changedFields = fields.filter(field => {
      const beforeValue = (beforeItem as Record<string, unknown>)[field]
      const afterValue = (afterItem as Record<string, unknown>)[field]
      return stableStringify(beforeValue ?? null) !== stableStringify(afterValue ?? null)
    })

    return changedFields.length > 0
      ? [
          {
            id: afterItem.id,
            before: beforeItem,
            after: afterItem,
            changedFields,
          },
        ]
      : []
  })
}

function detectReassignedWorkers(beforeAssignments: SnapshotAssignment[], afterAssignments: SnapshotAssignment[]) {
  const beforeByWorker = activeAssignmentByWorker(beforeAssignments)
  const afterByWorker = activeAssignmentByWorker(afterAssignments)

  return Array.from(afterByWorker.entries()).flatMap(([workerId, afterAssignment]) => {
    const beforeAssignment = beforeByWorker.get(workerId)
    if (!beforeAssignment || beforeAssignment.positionId === afterAssignment.positionId) return []

    return [
      {
        workerId,
        beforePositionId: beforeAssignment.positionId,
        afterPositionId: afterAssignment.positionId,
        workerName: workerName(afterAssignment) ?? workerName(beforeAssignment) ?? null,
        dni: afterAssignment.worker?.dni ?? beforeAssignment.worker?.dni ?? null,
      },
    ]
  })
}

function activeAssignmentByWorker(assignments: SnapshotAssignment[]) {
  const byWorker = new Map<string, SnapshotAssignment>()
  const ordered = [...assignments].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))

  for (const assignment of ordered) {
    if (assignment.endedAt) continue
    if (!byWorker.has(assignment.workerId)) {
      byWorker.set(assignment.workerId, assignment)
    }
  }

  return byWorker
}

function workerName(assignment: SnapshotAssignment) {
  const firstName = assignment.worker?.firstName?.trim()
  const lastName = assignment.worker?.lastName?.trim()
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  return name || undefined
}
