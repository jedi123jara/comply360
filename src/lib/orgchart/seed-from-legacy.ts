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
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

interface LegacyPreview {
  unitsToCreate: Array<{ slug: string; name: string }>
  positionsToCreate: Array<{ unitSlug: string; title: string }>
  assignmentsToCreate: number
  workersWithoutDepartment: number
  workersWithoutPosition: number
  totalWorkers: number
}

export async function previewLegacySeed(orgId: string): Promise<LegacyPreview> {
  const workers = await prisma.worker.findMany({
    where: { orgId, status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] } },
    select: { id: true, position: true, department: true },
  })

  const departments = new Map<string, string>() // slug -> name
  const positions = new Map<string, { unitSlug: string; title: string }>()
  let workersWithoutDepartment = 0
  let workersWithoutPosition = 0
  let assignmentsCount = 0

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
      const key = `${deptSlug}::${pos.toLowerCase()}`
      if (!positions.has(key)) {
        positions.set(key, { unitSlug: deptSlug, title: pos })
      }
      assignmentsCount++
    }
  }

  return {
    unitsToCreate: Array.from(departments.entries()).map(([slug, name]) => ({ slug, name })),
    positionsToCreate: Array.from(positions.values()),
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

  // Idempotencia: si ya hay unidades, no creamos duplicados — usamos upserts por slug.
  const created = { units: 0, positions: 0, assignments: 0 }

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

    let position = await prisma.orgPosition.findFirst({
      where: { orgId, orgUnitId: unit.id, title: { equals: title, mode: 'insensitive' } },
    })
    if (!position) {
      position = await prisma.orgPosition.create({
        data: { orgId, orgUnitId: unit.id, title, isManagerial: detectManagerial(title), seats: 0 },
      })
      created.positions++
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

function detectManagerial(title: string): boolean {
  const t = title.toLowerCase()
  return /(gerente|jefe|director|coordinador|supervisor|líder|lider|head|chief|presidente|ceo|cfo|cto)/i.test(t)
}
