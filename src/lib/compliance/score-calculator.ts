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
  /** % de capacitaciones obligatorias completadas (Fase 1, 2026-05) */
  scoreCapacitaciones: number
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
 * Factor de multa SUNAFIL según régimen laboral predominante de la org.
 * Basado en cuadro de infracciones D.S. 019-2006-TR + Ley 32353 (MYPE).
 *
 * Antes el cálculo era plano (estimatedMissingDocs * UIT * 0.23) sin importar
 * si era MYPE micro de 5 trabajadores o empresa general de 500. Resultado:
 * micro empresas veían "multa estimada S/145,929" — totalmente irreal y
 * alarmista (en realidad multa máxima MYPE micro por infracción muy grave
 * es ~9.55 UIT = S/52,525 distribuido entre todos los workers).
 *
 * Multipliers calibrados así:
 * - MYPE_MICRO (1-10 trab.): 0.10 — multas mínimas (Anexo I.A D.S. 019)
 * - MYPE_PEQUENA (11-100): 0.30
 * - GENERAL y otros (>100): 1.00 (referencia base)
 */
function getMultaMultiplierByRegimen(regimen: string | null | undefined, totalWorkers: number): number {
  if (!regimen) {
    // Sin régimen declarado, usar tamaño como proxy
    if (totalWorkers <= 10) return 0.10
    if (totalWorkers <= 100) return 0.30
    return 1.00
  }
  const r = regimen.toUpperCase()
  if (r === 'MYPE_MICRO') return 0.10
  if (r === 'MYPE_PEQUENA') return 0.30
  // AGRARIO, CONSTRUCCION, MINERO, etc. → multas iguales al régimen general
  return 1.00
}

/**
 * Calculate compliance score for an organization.
 * Score Global = weighted average of area scores.
 */
export async function calculateComplianceScore(orgId: string): Promise<ComplianceScoreResult> {
  const now = new Date()

  // 9 lightweight aggregate queries (incluye capacitaciones obligatorias — Fase 1)
  const [
    totalWorkers,
    workersWithContract,
    avgLegajoScore,
    expiredContracts,
    totalExpirable,
    workersWithAccumulatedVacations,
    totalMultaFromAlerts,
    obligatoryEnrollmentsTotal,
    obligatoryEnrollmentsCompleted,
  ] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' }, workerContracts: { some: { contract: { status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'] } } } } } }),
    prisma.worker.aggregate({ where: { orgId, status: { not: 'TERMINATED' } }, _avg: { legajoScore: true } }),
    prisma.contract.count({ where: { orgId, expiresAt: { lt: now }, status: { notIn: ['EXPIRED', 'ARCHIVED'] } } }),
    prisma.contract.count({ where: { orgId, expiresAt: { not: null }, status: { notIn: ['ARCHIVED'] } } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' }, vacations: { some: { diasPendientes: { gt: 0 } } } } }),
    prisma.workerAlert.aggregate({ where: { orgId, resolvedAt: null }, _sum: { multaEstimada: true } }),
    // Fase 1: capacitaciones obligatorias asignadas (toda inscripción a curso obligatorio activo)
    prisma.enrollment.count({ where: { orgId, course: { isObligatory: true, isActive: true } } }),
    prisma.enrollment.count({ where: { orgId, status: 'PASSED', course: { isObligatory: true, isActive: true } } }),
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
      scoreCapacitaciones: 100,
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

  // 7. Capacitaciones obligatorias completadas (weight: 5%, Fase 1)
  // Si no hay capacitaciones obligatorias asignadas, score = 100 (sin datos no penaliza).
  // Si hay alguna, score = % completadas.
  const scoreCapacitaciones = obligatoryEnrollmentsTotal > 0
    ? Math.round((obligatoryEnrollmentsCompleted / obligatoryEnrollmentsTotal) * 100)
    : 100

  // Weighted global score (20/15/20/15/10/15/5 = 100)
  // SST baja de 15% a 10% para hacer espacio a capacitaciones (5%) sin alterar
  // el resto de pesos. Capacitaciones SST cuentan dos veces (en SST via score
  // separado y aquí como % obligatorias completas).
  const scoreGlobal = Math.round(
    scoreContratos * 0.20 +
    scoreLegajos * 0.15 +
    scoreVencimientos * 0.20 +
    scoreDocumentos * 0.15 +
    scoreSst * 0.10 +
    scoreVacaciones * 0.15 +
    scoreCapacitaciones * 0.05
  )

  // Calculate potential fines from aggregated alert sum
  // Las alertas tienen su propia multaEstimada calibrada por tipo (D.S. 019)
  const alertMulta = Number(totalMultaFromAlerts._sum.multaEstimada ?? 0)
  // Estimate missing-doc fines: inverse of legajo completeness across all workers
  const estimatedMissingDocs = Math.round(totalWorkers * 18 * (1 - legajoAvg / 100))
  // ─── Calibrar por régimen + tamaño (Sprint QA Cockpit 2026-04) ───
  // Antes: estimatedMissingDocs * UIT * 0.23 sin importar tamaño
  // Resultado: MYPE micro 2 trabajadores con legajo 0% → S/45,540 fake
  // Ahora: factor por régimen + tope absoluto realista
  const orgRegimen = (await prisma.organization.findUnique({
    where: { id: orgId },
    select: { regimenPrincipal: true },
  }))?.regimenPrincipal
  const multiplier = getMultaMultiplierByRegimen(orgRegimen, totalWorkers)
  const multaDocsCalibrada = estimatedMissingDocs * UIT * 0.23 * multiplier
  // Tope absoluto: máximo realista para todo el set de problemas detectados
  // (D.S. 019: ningún cuadro permite multa > 52.5 UIT por una sola inspección)
  const TOPE_MULTA_TOTAL = 52.5 * UIT // S/288,750
  const multaPotencial = Math.min(TOPE_MULTA_TOTAL, alertMulta + multaDocsCalibrada)

  const breakdown = [
    { label: 'Contratos vigentes', score: scoreContratos, weight: 20, detail: `${workersWithContract}/${totalWorkers} trabajadores con contrato` },
    { label: 'Legajos completos', score: scoreLegajos, weight: 15, detail: `Promedio ${scoreLegajos}% de documentos basicos` },
    { label: 'Vencimientos al dia', score: scoreVencimientos, weight: 20, detail: `${expiredContracts} contratos vencidos` },
    { label: 'Documentos obligatorios', score: scoreDocumentos, weight: 15, detail: `Promedio ${scoreDocumentos}% de documentos completos` },
    { label: 'SST basico', score: scoreSst, weight: 10, detail: `Promedio ${scoreSst}% de documentos SST` },
    { label: 'Vacaciones al dia', score: scoreVacaciones, weight: 15, detail: `${workersWithAccumulatedVacations} trabajadores con vacaciones acumuladas` },
    {
      label: 'Capacitaciones obligatorias',
      score: scoreCapacitaciones,
      weight: 5,
      detail: obligatoryEnrollmentsTotal > 0
        ? `${obligatoryEnrollmentsCompleted}/${obligatoryEnrollmentsTotal} capacitaciones obligatorias completadas`
        : 'Sin capacitaciones obligatorias asignadas',
    },
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
    scoreCapacitaciones,
    totalWorkers,
    multaPotencial: Math.round(multaPotencial * 100) / 100,
    breakdown,
    sstBreakdown: sstResult?.breakdown,
  }
}
