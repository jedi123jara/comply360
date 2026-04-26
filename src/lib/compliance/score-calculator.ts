import { prisma } from '@/lib/prisma'
import { calculateSstScore, type SstAreaScore } from './sst-score'

export interface ComplianceScoreResult {
  scoreGlobal: number // 0-100
  scoreContratos: number
  scoreLegajos: number
  scoreVencimientos: number
  scoreDocumentos: number
  scoreSst: number
  scoreVacaciones: number  // was computed but not exported before
  totalWorkers: number
  multaPotencial: number
  breakdown: {
    label: string
    score: number
    weight: number
    detail: string
  }[]
  /** Desglose detallado del score SST por área (Sprint 5+, T6.6) */
  sstBreakdown?: SstAreaScore[]
}

const UIT = 5500 // 2026

/**
 * Calculate compliance score for an organization.
 * Score Global = weighted average of area scores.
 */
export async function calculateComplianceScore(orgId: string): Promise<ComplianceScoreResult> {
  const now = new Date()

  // 7 lightweight aggregate queries instead of 3 heavy findMany + includes
  const [
    totalWorkers,
    workersWithContract,
    avgLegajoScore,
    expiredContracts,
    totalExpirable,
    workersWithAccumulatedVacations,
    totalMultaFromAlerts,
  ] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' }, workerContracts: { some: { contract: { status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'] } } } } } }),
    prisma.worker.aggregate({ where: { orgId, status: { not: 'TERMINATED' } }, _avg: { legajoScore: true } }),
    prisma.contract.count({ where: { orgId, expiresAt: { lt: now }, status: { notIn: ['EXPIRED', 'ARCHIVED'] } } }),
    prisma.contract.count({ where: { orgId, expiresAt: { not: null }, status: { notIn: ['ARCHIVED'] } } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' }, vacations: { some: { diasPendientes: { gt: 0 } } } } }),
    prisma.workerAlert.aggregate({ where: { orgId, resolvedAt: null }, _sum: { multaEstimada: true } }),
  ])

  if (totalWorkers === 0) {
    return {
      scoreGlobal: 0,
      scoreContratos: 0,
      scoreLegajos: 0,
      scoreVencimientos: 100,
      scoreDocumentos: 0,
      scoreSst: 0,
      scoreVacaciones: 100,
      totalWorkers: 0,
      multaPotencial: 0,
      breakdown: [],
    }
  }

  // 1. Contratos vigentes y registrados (weight: 20%)
  const scoreContratos = Math.round((workersWithContract / totalWorkers) * 100)

  // 2. Legajos completos (weight: 15%)
  // Use pre-computed legajoScore (calculated per-worker on document upload) as proxy
  const legajoAvg = avgLegajoScore._avg.legajoScore ?? 0
  const scoreLegajos = Math.round(legajoAvg)

  // 3. Vencimientos al dia (weight: 20%)
  const scoreVencimientos = totalExpirable > 0
    ? Math.round(((totalExpirable - expiredContracts) / totalExpirable) * 100)
    : 100

  // 4. Documentos obligatorios completos (weight: 15%)
  // legajoScore already reflects document completeness percentage
  const scoreDocumentos = Math.round(legajoAvg)

  // 5. SST basico (weight: 15%)
  // Score real desglosado por área (T6.6) — antes era proxy de legajoAvg.
  // Si la query SST falla, fallback a legajoAvg para no romper el score global.
  let sstResult
  try {
    sstResult = await calculateSstScore(orgId)
  } catch {
    sstResult = null
  }
  const scoreSst = sstResult ? sstResult.scoreGlobal : Math.round(legajoAvg)

  // 6. Vacaciones sin acumulacion (weight: 15%)
  const scoreVacaciones = Math.round(((totalWorkers - workersWithAccumulatedVacations) / totalWorkers) * 100)

  // Weighted global score (20/15/20/15/15/15)
  const scoreGlobal = Math.round(
    scoreContratos * 0.20 +
    scoreLegajos * 0.15 +
    scoreVencimientos * 0.20 +
    scoreDocumentos * 0.15 +
    scoreSst * 0.15 +
    scoreVacaciones * 0.15
  )

  // Calculate potential fines from aggregated alert sum
  const alertMulta = Number(totalMultaFromAlerts._sum.multaEstimada ?? 0)
  // Estimate missing-doc fines: inverse of legajo completeness across all workers
  const estimatedMissingDocs = Math.round(totalWorkers * 18 * (1 - legajoAvg / 100))
  const multaPotencial = alertMulta + estimatedMissingDocs * UIT * 0.23

  const breakdown = [
    { label: 'Contratos vigentes', score: scoreContratos, weight: 20, detail: `${workersWithContract}/${totalWorkers} trabajadores con contrato` },
    { label: 'Legajos completos', score: scoreLegajos, weight: 15, detail: `Promedio ${scoreLegajos}% de documentos basicos` },
    { label: 'Vencimientos al dia', score: scoreVencimientos, weight: 20, detail: `${expiredContracts} contratos vencidos` },
    { label: 'Documentos obligatorios', score: scoreDocumentos, weight: 15, detail: `Promedio ${scoreDocumentos}% de documentos completos` },
    { label: 'SST basico', score: scoreSst, weight: 15, detail: `Promedio ${scoreSst}% de documentos SST` },
    { label: 'Vacaciones al dia', score: scoreVacaciones, weight: 15, detail: `${workersWithAccumulatedVacations} trabajadores con vacaciones acumuladas` },
  ]

  // Persist snapshot to ComplianceScore table for trend tracking
  // Non-blocking with retry — don't fail the calculation if persistence fails
  prisma.complianceScore.create({
    data: {
      orgId,
      scoreGlobal,
      scoreContratos,
      scoreSst,
      scoreDocumentos,
      scoreVencimientos,
      scorePlanilla: scoreLegajos,
      multaEvitada: null,
    },
  }).catch(async () => {
    // Retry once after 1 second
    try {
      await new Promise(r => setTimeout(r, 1000))
      await prisma.complianceScore.create({
        data: {
          orgId,
          scoreGlobal,
          scoreContratos,
          scoreSst,
          scoreDocumentos,
          scoreVencimientos,
          scorePlanilla: scoreLegajos,
          multaEvitada: null,
        },
      })
    } catch {
      console.warn(`[ComplianceScore] Failed to persist score for org ${orgId}`)
    }
  })

  return {
    scoreGlobal,
    scoreContratos,
    scoreLegajos,
    scoreVencimientos,
    scoreDocumentos,
    scoreSst,
    scoreVacaciones,
    totalWorkers,
    multaPotencial: Math.round(multaPotencial * 100) / 100,
    breakdown,
    sstBreakdown: sstResult?.breakdown,
  }
}
