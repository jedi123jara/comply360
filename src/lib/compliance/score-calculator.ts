import { prisma } from '@/lib/prisma'

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
}

const UIT = 5500 // 2026

/**
 * Calculate compliance score for an organization.
 * Score Global = weighted average of area scores.
 */
export async function calculateComplianceScore(orgId: string): Promise<ComplianceScoreResult> {
  const [
    workers,
    contracts,
    workerAlerts,
  ] = await Promise.all([
    prisma.worker.findMany({
      where: { orgId, status: { not: 'TERMINATED' } },
      include: {
        documents: { select: { documentType: true, status: true, category: true } },
        workerContracts: {
          include: { contract: { select: { status: true, expiresAt: true } } },
        },
        vacations: { select: { diasPendientes: true, esDoble: true } },
      },
    }),
    prisma.contract.findMany({
      where: { orgId, status: { notIn: ['ARCHIVED'] } },
      select: { status: true, expiresAt: true },
    }),
    prisma.workerAlert.findMany({
      where: { orgId, resolvedAt: null },
      select: { severity: true, type: true, multaEstimada: true },
    }),
  ])

  const totalWorkers = workers.length

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
  const workersWithContract = workers.filter(w =>
    w.workerContracts.some(wc => ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'].includes(wc.contract.status))
  ).length
  const scoreContratos = Math.round((workersWithContract / totalWorkers) * 100)

  // 2. Legajos completos (weight: 15%)
  const REQUIRED_DOCS = [
    'contrato_trabajo', 'dni_copia', 'declaracion_jurada',
    't_registro', 'boleta_pago', 'afp_onp_afiliacion', 'essalud_registro',
  ]
  let totalLegajoPercent = 0
  for (const w of workers) {
    const uploaded = w.documents.filter(d => d.status !== 'MISSING').map(d => d.documentType)
    const completed = REQUIRED_DOCS.filter(d => uploaded.includes(d)).length
    totalLegajoPercent += (completed / REQUIRED_DOCS.length) * 100
  }
  const scoreLegajos = Math.round(totalLegajoPercent / totalWorkers)

  // 3. Vencimientos al dia (weight: 20%)
  const now = new Date()
  const expiredContracts = contracts.filter(c => c.expiresAt && new Date(c.expiresAt) < now && c.status !== 'EXPIRED').length
  const totalExpirable = contracts.filter(c => c.expiresAt).length
  const scoreVencimientos = totalExpirable > 0
    ? Math.round(((totalExpirable - expiredContracts) / totalExpirable) * 100)
    : 100

  // 4. Documentos obligatorios completos (weight: 15%)
  const SST_DOCS = ['examen_medico_ingreso', 'induccion_sst', 'entrega_epp', 'capacitacion_sst']
  let totalDocPercent = 0
  for (const w of workers) {
    const uploaded = w.documents.filter(d => d.status !== 'MISSING').map(d => d.documentType)
    const allRequired = [...REQUIRED_DOCS, ...SST_DOCS]
    const completed = allRequired.filter(d => uploaded.includes(d)).length
    totalDocPercent += (completed / allRequired.length) * 100
  }
  const scoreDocumentos = Math.round(totalDocPercent / totalWorkers)

  // 5. SST basico (weight: 15%)
  let totalSstPercent = 0
  for (const w of workers) {
    const uploaded = w.documents.filter(d => d.category === 'SST' && d.status !== 'MISSING').length
    const sstRequired = 7 // IPERC, induccion, EPP, capacitacion, exam ingreso, exam periodico, reglamento
    totalSstPercent += Math.min(100, (uploaded / sstRequired) * 100)
  }
  const scoreSst = Math.round(totalSstPercent / totalWorkers)

  // 6. Vacaciones sin acumulacion (weight: 15%)
  const workersWithAccumulated = workers.filter(w =>
    w.vacations.filter(v => v.diasPendientes > 0).length >= 2
  ).length
  const scoreVacaciones = Math.round(((totalWorkers - workersWithAccumulated) / totalWorkers) * 100)

  // Weighted global score
  const scoreGlobal = Math.round(
    scoreContratos * 0.20 +
    scoreLegajos * 0.15 +
    scoreVencimientos * 0.20 +
    scoreDocumentos * 0.15 +
    scoreSst * 0.15 +
    scoreVacaciones * 0.15
  )

  // Calculate potential fines
  let multaPotencial = 0
  for (const alert of workerAlerts) {
    if (alert.multaEstimada) {
      multaPotencial += Number(alert.multaEstimada)
    }
  }
  // Add estimated fines for missing docs
  const totalMissing = workers.reduce((sum, w) => {
    const uploaded = w.documents.filter(d => d.status !== 'MISSING').map(d => d.documentType)
    return sum + REQUIRED_DOCS.filter(d => !uploaded.includes(d)).length
  }, 0)
  multaPotencial += totalMissing * UIT * 0.23

  const breakdown = [
    { label: 'Contratos vigentes', score: scoreContratos, weight: 20, detail: `${workersWithContract}/${totalWorkers} trabajadores con contrato` },
    { label: 'Legajos completos', score: scoreLegajos, weight: 15, detail: `Promedio ${scoreLegajos}% de documentos basicos` },
    { label: 'Vencimientos al dia', score: scoreVencimientos, weight: 20, detail: `${expiredContracts} contratos vencidos` },
    { label: 'Documentos obligatorios', score: scoreDocumentos, weight: 15, detail: `Promedio ${scoreDocumentos}% de documentos completos` },
    { label: 'SST basico', score: scoreSst, weight: 15, detail: `Promedio ${scoreSst}% de documentos SST` },
    { label: 'Vacaciones al dia', score: scoreVacaciones, weight: 15, detail: `${workersWithAccumulated} trabajadores con vacaciones acumuladas` },
  ]

  // Persist snapshot to ComplianceScore table for trend tracking
  // (non-blocking — don't fail the calculation if persistence fails)
  prisma.complianceScore.create({
    data: {
      orgId,
      scoreGlobal,
      scoreContratos,
      scoreSst,
      scoreDocumentos,
      scoreVencimientos,
      scorePlanilla: scoreLegajos, // reuse scorePlanilla field for legajos score
      multaEvitada: null,
    },
  }).catch(() => {
    // Silently ignore persistence errors
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
  }
}
