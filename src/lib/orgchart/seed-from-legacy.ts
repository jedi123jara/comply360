import { prisma } from '@/lib/prisma'
import { insertClosureForNewUnit } from './closure-maintenance'

/**
 * Bootstrap del organigrama desde los strings legacy `Worker.position` y
 * `Worker.department`. Idempotente — re-correrlo no duplica.
 *
 * Estrategia:
 *   1. Detectar `department` distintos → upsert OrgUnit por slug (kind=AREA)
 *   2. Detectar `position` distintos por department → upsert OrgPosition
 *   3. Crear OrgAssignment vigente para cada Worker activo
 *
 * Si dryRun=true, solo devuelve el preview sin escribir.
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

interface LegacyWorker {
  id: string
  position: string | null
  department: string | null
}

interface LegacyUnitRecord {
  id: string
  name: string
  slug: string
}

interface LegacyPositionRecord {
  id: string
  orgUnitId: string
  title: string
  seats: number
}

interface LegacyAssignmentRecord {
  workerId: string
}

export interface LegacyPreview {
  unitsToCreate: Array<{ slug: string; name: string }>
  positionsToCreate: Array<{ unitSlug: string; title: string }>
  positionsToResize: Array<{ unitSlug: string; title: string; currentSeats: number; requiredSeats: number }>
  assignmentsToCreate: number
  workersWithoutDepartment: number
  workersWithoutPosition: number
  totalWorkers: number
}

export async function previewLegacySeed(orgId: string): Promise<LegacyPreview> {
  const [workers, existingUnits, existingPositions, activeAssignments] = await Promise.all([
    prisma.worker.findMany({
      where: { orgId, status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] } },
      select: { id: true, position: true, department: true },
    }),
    prisma.orgUnit.findMany({
      where: { orgId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.orgPosition.findMany({
      where: { orgId, validTo: null },
      select: { id: true, orgUnitId: true, title: true, seats: true },
    }),
    prisma.orgAssignment.findMany({
      where: { orgId, endedAt: null },
      select: { workerId: true },
    }),
  ])

  return buildLegacySeedPreview(workers, existingUnits, existingPositions, activeAssignments)
}

export function buildLegacySeedPreview(
  workers: LegacyWorker[],
  existingUnits: LegacyUnitRecord[] = [],
  existingPositions: LegacyPositionRecord[] = [],
  activeAssignments: LegacyAssignmentRecord[] = [],
): LegacyPreview {
  const departments = new Map<string, string>() // slug -> name
  const positions = new Map<string, { unitSlug: string; title: string }>()
  const positionSeatCounts = new Map<string, number>()
  let workersWithoutDepartment = 0
  let workersWithoutPosition = 0
  let assignmentsCount = 0
  const activeWorkerIds = new Set(activeAssignments.map(assignment => assignment.workerId))

  for (const w of workers) {
    const dept = (w.department ?? '').trim()
    const pos = (w.position ?? '').trim()
    if (!dept) workersWithoutDepartment++
    if (!pos) workersWithoutPosition++
    if (!dept && !pos) continue

    const deptName = dept || 'Sin área'
    const deptSlug = slugify(deptName) || 'sin-area'
    if (!departments.has(deptSlug)) departments.set(deptSlug, deptName)

    if (pos) {
      const key = legacyPositionKey(deptSlug, pos)
      if (!positions.has(key)) {
        positions.set(key, { unitSlug: deptSlug, title: pos })
      }
      positionSeatCounts.set(key, (positionSeatCounts.get(key) ?? 0) + 1)
      if (!activeWorkerIds.has(w.id)) assignmentsCount++
    }
  }

  const existingUnitBySlug = new Map(existingUnits.map(unit => [unit.slug, unit]))
  const existingPositionByKey = buildExistingPositionKeyMap(existingUnits, existingPositions)

  return {
    unitsToCreate: Array.from(departments.entries())
      .filter(([slug]) => !existingUnitBySlug.has(slug))
      .map(([slug, name]) => ({ slug, name })),
    positionsToCreate: Array.from(positions.entries())
      .filter(([key]) => !existingPositionByKey.has(key))
      .map(([, position]) => position),
    positionsToResize: Array.from(positions.entries()).flatMap(([key, position]) => {
      const existing = existingPositionByKey.get(key)
      const requiredSeats = Math.max(1, positionSeatCounts.get(key) ?? 1)
      if (!existing || existing.seats >= requiredSeats) return []
      return [{ ...position, currentSeats: existing.seats, requiredSeats }]
    }),
    assignmentsToCreate: assignmentsCount,
    workersWithoutDepartment,
    workersWithoutPosition,
    totalWorkers: workers.length,
  }
}

export async function applyLegacySeed(orgId: string, takenById?: string | null) {
  const workers = await prisma.worker.findMany({
    where: { orgId, status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] } },
    select: { id: true, position: true, department: true },
  })
  const positionSeatCounts = countLegacyPositionSeats(workers)

  // Idempotencia: si ya hay unidades, no creamos duplicados — usamos upserts por slug.
  const created = { units: 0, positions: 0, assignments: 0, seatsAdjusted: 0 }

  for (const w of workers) {
    const dept = (w.department ?? '').trim() || 'Sin área'
    const slug = slugify(dept) || 'sin-area'

    let unit = await prisma.orgUnit.findUnique({
      where: { orgId_slug: { orgId, slug } },
    })
    if (!unit) {
      unit = await prisma.orgUnit.create({
        data: { orgId, slug, name: dept, kind: 'AREA', level: 0 },
      })
      await insertClosureForNewUnit(unit.id, null)
      created.units++
    }

    const title = (w.position ?? '').trim()
    if (!title) continue
    const positionKey = legacyPositionKey(slug, title)
    const requiredSeats = Math.max(1, positionSeatCounts.get(positionKey) ?? 1)

    let position = await prisma.orgPosition.findFirst({
      where: { orgId, orgUnitId: unit.id, title: { equals: title, mode: 'insensitive' } },
    })
    if (!position) {
      position = await prisma.orgPosition.create({
        data: { orgId, orgUnitId: unit.id, title, isManagerial: detectManagerial(title), seats: requiredSeats },
      })
      created.positions++
    } else if (position.seats < requiredSeats) {
      position = await prisma.orgPosition.update({
        where: { id: position.id },
        data: { seats: requiredSeats },
      })
      created.seatsAdjusted++
    }

    const existingAssignment = await prisma.orgAssignment.findFirst({
      where: { orgId, workerId: w.id, endedAt: null },
    })
    if (!existingAssignment) {
      await prisma.orgAssignment.create({
        data: {
          orgId,
          workerId: w.id,
          positionId: position.id,
          isPrimary: true,
          isInterim: false,
        },
      })
      created.assignments++
    }
  }

  return { ...created, totalWorkers: workers.length, takenById: takenById ?? null }
}

function countLegacyPositionSeats(workers: LegacyWorker[]) {
  const counts = new Map<string, number>()
  for (const worker of workers) {
    const title = (worker.position ?? '').trim()
    if (!title) continue
    const department = (worker.department ?? '').trim() || 'Sin área'
    const unitSlug = slugify(department) || 'sin-area'
    const key = legacyPositionKey(unitSlug, title)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function buildExistingPositionKeyMap(units: LegacyUnitRecord[], positions: LegacyPositionRecord[]) {
  const unitById = new Map(units.map(unit => [unit.id, unit]))
  const map = new Map<string, LegacyPositionRecord>()
  for (const position of positions) {
    const unit = unitById.get(position.orgUnitId)
    if (!unit) continue
    map.set(legacyPositionKey(unit.slug, position.title), position)
  }
  return map
}

function legacyPositionKey(unitSlug: string, title: string) {
  return `${unitSlug}::${normalizeKey(title)}`
}

function normalizeKey(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectManagerial(title: string): boolean {
  const t = title.toLowerCase()
  return /(gerente|jefe|director|coordinador|supervisor|líder|lider|head|chief|presidente|ceo|cfo|cto)/i.test(t)
}
