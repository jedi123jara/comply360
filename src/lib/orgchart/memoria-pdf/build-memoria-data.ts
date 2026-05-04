/**
 * Construye los datos consolidados para la Memoria Anual del Organigrama.
 *
 * Lee tree actual, doctor report, snapshots del año, contratos activos y los
 * empaqueta en un objeto `MemoriaAnualData` listo para renderizar a PDF.
 *
 * Diseño server-only — usa prisma directamente.
 */

import { prisma } from '@/lib/prisma'
import { getTree } from '../tree-service'
import { runOrgDoctor } from '../org-doctor'
import { buildCoverageReport } from '../coverage-aggregator'
import { listSnapshots, getVerifiedSnapshotTree } from '../snapshot-service'
import { COMPLIANCE_ROLES } from '../compliance-rules'
import type { OrgChartTree, ComplianceRoleType } from '../types'

import type { MemoriaAnualData, MemoriaAnualEvolution } from './types'
import { pickClosestSnapshot, computeHighlights } from './pure'

// Re-export para compatibilidad con código que las importaba desde aquí.
export { pickClosestSnapshot, computeHighlights } from './pure'

/**
 * Carga datos básicos de la organización para la portada.
 */
async function loadOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true,
      razonSocial: true,
      ruc: true,
      sector: true,
      plan: true,
      regimenPrincipal: true,
    },
  })
  if (!org) {
    throw new Error(`Organización ${orgId} no encontrada`)
  }
  return {
    name: org.name ?? org.razonSocial ?? 'Empresa',
    razonSocial: org.razonSocial,
    ruc: org.ruc,
    sector: org.sector,
    plan: org.plan,
    regimenPrincipal: org.regimenPrincipal,
  }
}

/**
 * Calcula el headcount mensual a partir de fechas de ingreso/cese de trabajadores.
 *
 * Para cada mes del año, cuenta cuántos workers tenían `fechaIngreso <= fin de mes`
 * y `(fechaCese == null OR fechaCese > fin de mes)`.
 */
async function computeHeadcountByMonth(
  orgId: string,
  year: number,
): Promise<Array<{ month: string; workers: number }>> {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']
  const workers = await prisma.worker.findMany({
    where: { orgId },
    select: { fechaIngreso: true, fechaCese: true },
  })

  return months.map((label, idx) => {
    const monthEnd = new Date(year, idx + 1, 0, 23, 59, 59) // último día del mes
    const count = workers.filter((w) => {
      const ingreso = new Date(w.fechaIngreso).getTime()
      const cese = w.fechaCese ? new Date(w.fechaCese).getTime() : null
      return ingreso <= monthEnd.getTime() && (cese === null || cese > monthEnd.getTime())
    }).length
    return { month: label, workers: count }
  })
}

/**
 * Construye los datos completos para la Memoria Anual.
 *
 * Si hay snapshots dentro del año, usa el más cercano al 01-ene como inicio y
 * el más cercano al 31-dic (o el más reciente del año) como cierre. Si no hay
 * snapshot de inicio, las comparaciones se omiten pero el resto del informe
 * se genera igual.
 */
export async function buildMemoriaAnualData(
  orgId: string,
  year: number,
): Promise<MemoriaAnualData> {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)

  // Carga en paralelo
  const [org, allSnapshots, headcountByMonth] = await Promise.all([
    loadOrg(orgId),
    listSnapshots(orgId, 200),
    computeHeadcountByMonth(orgId, year),
  ])

  const yearSnapshots = allSnapshots.filter((s) => {
    const t = new Date(s.createdAt).getTime()
    return t >= yearStart.getTime() && t <= yearEnd.getTime()
  })

  const startSnapshotMeta = pickClosestSnapshot(yearSnapshots, yearStart)
  // Para el cierre tomamos el snapshot del último día del año o el más reciente disponible.
  const endSnapshotMeta = pickClosestSnapshot(yearSnapshots, yearEnd)

  // Tree de cierre — preferimos snapshot, pero si no hay ninguno este año
  // usamos el tree actual (puede que sea año en curso).
  let endTree: OrgChartTree
  if (endSnapshotMeta) {
    const verified = await getVerifiedSnapshotTree(orgId, endSnapshotMeta.id)
    endTree = verified.tree
  } else {
    endTree = await getTree(orgId)
  }

  // Tree de inicio — solo si hay snapshot de inicio.
  let startTree: OrgChartTree | null = null
  if (startSnapshotMeta) {
    try {
      const verified = await getVerifiedSnapshotTree(orgId, startSnapshotMeta.id)
      startTree = verified.tree
    } catch {
      // si la integridad falla, lo omitimos (no rompemos la memoria)
      startTree = null
    }
  }

  // Doctor + coverage al cierre.
  const doctorReport = await runOrgDoctor(orgId)
  const coverage = buildCoverageReport(endTree, doctorReport.findings)

  // Stats agregados.
  const positionsCount = endTree.positions.length
  const occupantsByPos = new Map<string, number>()
  for (const a of endTree.assignments) {
    occupantsByPos.set(a.positionId, (occupantsByPos.get(a.positionId) ?? 0) + 1)
  }
  const vacantCount = endTree.positions.reduce(
    (sum, p) => sum + Math.max(0, p.seats - (occupantsByPos.get(p.id) ?? 0)),
    0,
  )

  const activeContracts = await prisma.contract.count({
    where: { orgId, status: { notIn: ['EXPIRED', 'ARCHIVED'] } },
  })

  // Roles legales requeridos vs asignados (stat compacto para portada).
  const requiredRoleTypes = Object.keys(COMPLIANCE_ROLES) as ComplianceRoleType[]
  const assignedRoleTypes = new Set(endTree.complianceRoles.map((r) => r.roleType))
  const legalRolesAssigned = requiredRoleTypes.filter((t) => assignedRoleTypes.has(t)).length
  const legalRolesRequired = requiredRoleTypes.length

  const evolution: MemoriaAnualEvolution = {
    startSnapshot: startSnapshotMeta
      ? {
          id: startSnapshotMeta.id,
          label: startSnapshotMeta.label,
          hash: startSnapshotMeta.hash,
          createdAt:
            startSnapshotMeta.createdAt instanceof Date
              ? startSnapshotMeta.createdAt.toISOString()
              : startSnapshotMeta.createdAt,
          workerCount: startSnapshotMeta.workerCount,
          unitCount: startSnapshotMeta.unitCount,
          depthMax: startSnapshotMeta.depthMax,
        }
      : null,
    endSnapshot: endSnapshotMeta
      ? {
          id: endSnapshotMeta.id,
          label: endSnapshotMeta.label,
          hash: endSnapshotMeta.hash,
          createdAt:
            endSnapshotMeta.createdAt instanceof Date
              ? endSnapshotMeta.createdAt.toISOString()
              : endSnapshotMeta.createdAt,
          workerCount: endSnapshotMeta.workerCount,
          unitCount: endSnapshotMeta.unitCount,
          depthMax: endSnapshotMeta.depthMax,
        }
      : {
          id: 'live',
          label: 'Estado actual (sin snapshot de cierre)',
          hash: '—',
          createdAt: new Date().toISOString(),
          workerCount: endTree.assignments.length,
          unitCount: endTree.units.length,
          depthMax: 0,
        },
    totalSnapshots: yearSnapshots.length,
    highlights: computeHighlights(startTree, endTree),
    headcountByMonth,
  }

  return {
    org,
    year,
    generatedAt: new Date(),
    tree: endTree,
    doctorReport,
    coverage,
    evolution,
    stats: {
      workerCount: endTree.assignments.length,
      unitCount: endTree.units.length,
      positionCount: positionsCount,
      vacantCount,
      activeContracts,
      legalRolesAssigned,
      legalRolesRequired,
    },
  }
}
