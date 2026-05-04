/**
 * Constructor del Trombinoscopio Compliance (people view).
 *
 * Devuelve un dataset enriquecido por trabajador con:
 *   - datos básicos (nombre, foto, área, cargo)
 *   - score de compliance individual (0-100)
 *   - tono (success/warning/danger/critical) según riesgo SUNAFIL
 *   - razones del score (alertas activas, documentos faltantes, vencimientos)
 *
 * Server-only — usa Prisma. Función pura testeable sólo el cálculo del score
 * (en el archivo `people-score.ts` aparte).
 */
import { prisma } from '@/lib/prisma'
import { computeWorkerComplianceScore } from './people-score'

export interface PeopleViewItem {
  workerId: string
  firstName: string
  lastName: string
  photoUrl: string | null
  email: string | null
  unitName: string | null
  positionTitle: string | null
  contractType: string
  hireDate: string
  yearsOfTenure: number
  legajoScore: number | null
  /** Score compliance derivado (0-100) — MAX(legajoScore, alertSeverity, contractRisk). */
  complianceScore: number
  tone: 'success' | 'warning' | 'danger' | 'critical'
  reasons: string[]
  flags: {
    hasOpenAlerts: boolean
    hasCriticalAlert: boolean
    contractAtRisk: boolean
    legajoIncomplete: boolean
  }
}

export interface PeopleViewFilters {
  search?: string
  unitId?: string | null
  contractType?: string | null
  riskMin?: number | null
  onlyAtRisk?: boolean
}

export interface PeopleViewResult {
  items: PeopleViewItem[]
  totals: {
    workers: number
    inRegla: number
    enAtencion: number
    enRiesgo: number
    criticos: number
  }
}

export async function buildPeopleView(
  orgId: string,
  filters: PeopleViewFilters = {},
): Promise<PeopleViewResult> {
  const workers = await prisma.worker.findMany({
    where: {
      orgId,
      status: { not: 'TERMINATED' },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      photoUrl: true,
      department: true,
      position: true,
      tipoContrato: true,
      fechaIngreso: true,
      legajoScore: true,
    },
    take: 500, // hard cap por seguridad
  })

  // Cargar alertas por worker
  const workerIds = workers.map((w) => w.id)
  const alerts = await prisma.workerAlert.findMany({
    where: {
      workerId: { in: workerIds },
      resolvedAt: null,
    },
    select: { workerId: true, severity: true, type: true },
  })

  // Indexar alerts
  const alertsByWorker = new Map<string, typeof alerts>()
  for (const a of alerts) {
    const list = alertsByWorker.get(a.workerId) ?? []
    list.push(a)
    alertsByWorker.set(a.workerId, list)
  }

  // OrgAssignments para tener el "área formal" del organigrama
  const assignments = await prisma.orgAssignment.findMany({
    where: { orgId, workerId: { in: workerIds }, endedAt: null },
    select: {
      workerId: true,
      isPrimary: true,
      position: { select: { title: true, orgUnit: { select: { name: true } } } },
    },
  })
  const assignmentsByWorker = new Map<string, (typeof assignments)[0]>()
  for (const a of assignments) {
    if (a.isPrimary || !assignmentsByWorker.has(a.workerId)) {
      assignmentsByWorker.set(a.workerId, a)
    }
  }

  const items: PeopleViewItem[] = workers.map((w) => {
    const workerAlerts = alertsByWorker.get(w.id) ?? []
    const assignment = assignmentsByWorker.get(w.id)
    const tenureYears = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(w.fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      ),
    )

    const scoreData = computeWorkerComplianceScore({
      legajoScore: w.legajoScore ?? null,
      contractType: String(w.tipoContrato),
      hireDate: w.fechaIngreso,
      alertSeverities: workerAlerts.map((a) => String(a.severity)),
    })

    return {
      workerId: w.id,
      firstName: w.firstName,
      lastName: w.lastName,
      photoUrl: w.photoUrl,
      email: w.email,
      unitName: assignment?.position.orgUnit.name ?? w.department ?? null,
      positionTitle: assignment?.position.title ?? w.position ?? null,
      contractType: String(w.tipoContrato),
      hireDate: w.fechaIngreso.toISOString(),
      yearsOfTenure: tenureYears,
      legajoScore: w.legajoScore,
      complianceScore: scoreData.score,
      tone: scoreData.tone,
      reasons: scoreData.reasons,
      flags: {
        hasOpenAlerts: workerAlerts.length > 0,
        hasCriticalAlert: workerAlerts.some((a) => String(a.severity) === 'CRITICAL'),
        contractAtRisk: scoreData.contractAtRisk,
        legajoIncomplete: (w.legajoScore ?? 100) < 70,
      },
    }
  })

  // Aplicar filtros
  let filtered = items
  if (filters.search) {
    const q = filters.search.toLowerCase()
    filtered = filtered.filter(
      (i) =>
        `${i.firstName} ${i.lastName}`.toLowerCase().includes(q) ||
        (i.email ?? '').toLowerCase().includes(q) ||
        (i.positionTitle ?? '').toLowerCase().includes(q) ||
        (i.unitName ?? '').toLowerCase().includes(q),
    )
  }
  if (filters.unitId) {
    filtered = filtered.filter((i) => i.unitName === filters.unitId)
  }
  if (filters.contractType) {
    filtered = filtered.filter((i) => i.contractType === filters.contractType)
  }
  if (filters.onlyAtRisk) {
    filtered = filtered.filter((i) => i.tone !== 'success')
  }

  const totals = {
    workers: filtered.length,
    inRegla: filtered.filter((i) => i.tone === 'success').length,
    enAtencion: filtered.filter((i) => i.tone === 'warning').length,
    enRiesgo: filtered.filter((i) => i.tone === 'danger').length,
    criticos: filtered.filter((i) => i.tone === 'critical').length,
  }

  // Ordenar: primero los críticos, luego resto por score asc, luego nombre
  filtered.sort((a, b) => {
    const toneOrder = ['critical', 'danger', 'warning', 'success']
    const da = toneOrder.indexOf(a.tone)
    const db = toneOrder.indexOf(b.tone)
    if (da !== db) return da - db
    if (a.complianceScore !== b.complianceScore) return a.complianceScore - b.complianceScore
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  })

  return { items: filtered, totals }
}
