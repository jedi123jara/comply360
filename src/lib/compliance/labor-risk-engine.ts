import { prisma } from '@/lib/prisma'
import { scanOrgRisks, type OrgRiskReport, type RiesgoDetectado } from './risk-scanner'
import { calcularScoreSst, UIT_2026, RMV_2026, type SstScoreResult } from '@/lib/sst/scoring'
import { loadSstScoreSnapshot } from '@/lib/sst/score-snapshot'
import { calcularMultaSunafilSoles } from '@/lib/legal-engine/peru-labor'
import {
  CATEGORY_LABEL,
  SUNAFIL_READY_DOCS,
  SUNAFIL_READY_META,
  isDocApplicable,
  type SunafilCategory,
  type SunafilDocSpec,
} from '@/data/legal/sunafil-ready-catalog'
import {
  resolveSunafilDocStatus,
  type DocStatus,
  type SunafilEvidenceSnapshot,
  type WorkerCoverageBucket,
} from './sunafil-evidence'
import { Prisma } from '@/generated/prisma/client'

export type LaborRiskMode = 'quick' | 'full' | 'inspection'
export type LaborRiskArea =
  | 'SST'
  | 'CONTRATOS'
  | 'PLANILLA'
  | 'BENEFICIOS'
  | 'JORNADA'
  | 'SEGURIDAD_SOCIAL'
  | 'IGUALDAD'
  | 'HSL'
  | 'TERCEROS'
  | 'DOCUMENTOS'

export type LaborRiskSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type LaborRiskGravity = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
export type LaborRiskConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface LaborRiskFinding {
  id: string
  obligationId: string
  area: LaborRiskArea
  title: string
  severity: LaborRiskSeverity
  legalGravity: LaborRiskGravity
  baseLegal: string
  affectedEntities: Array<{ type: 'worker' | 'org' | 'sede' | 'position'; id: string; label: string }>
  potentialFineSoles: number
  potentialFineUit: number
  estimatedAfterSubsanationSoles: number
  avoidableAmountSoles: number
  confidence: LaborRiskConfidence
  evidenceSourcesChecked: string[]
  missingEvidence: string[]
  action: string
  suggestedOwnerRole: string
  suggestedDueDate: string
  route: string
  riskScore: number
}

export interface RiskAction {
  id: string
  title: string
  area: LaborRiskArea
  severity: LaborRiskSeverity
  impactSoles: number
  dueDate: string
  ownerRole: string
  route: string
  evidenceGoal: string
}

export interface LaborRiskEvidenceRequirement {
  id: string
  title: string
  category: SunafilCategory
  categoryLabel: string
  area: LaborRiskArea
  status: Exclude<DocStatus, 'NO_APLICA'>
  gravity: LaborRiskGravity
  severity: LaborRiskSeverity
  baseLegal: string
  coverage: { present: number; total: number }
  missingCount: number
  potentialFineSoles: number
  avoidableAmountSoles: number
  actionHint: string
  evidenceSources: string[]
  lastExpiresAt: string | null
  route: string
  riskScore: number
}

export interface SunafilReadySignal {
  totalDocs: number
  applicableDocs: number
  completedDocs: number
  partialDocs: number
  missingDocs: number
  expiredDocs: number
  scoreGlobal: number
  potentialFineSoles: number
  estimatedAfterSubsanationSoles: number
  avoidableAmountSoles: number
  requirements: LaborRiskEvidenceRequirement[]
}

export interface LaborRiskSnapshot {
  orgId: string
  calculatedAt: string
  mode: LaborRiskMode
  score: {
    overall: number
    sunafilReady: number
    sst: number
    evidenceConfidence: number
    avoidableClosure: number
  }
  exposure: {
    potentialFineSoles: number
    potentialFineUit: number
    estimatedAfterSubsanationSoles: number
    avoidableAmountSoles: number
    avoidableReductionPercent: number
  }
  defense: {
    openTasks: number
    completedTasks: number
    completedWithEvidence: number
    unresolvedAlerts: number
    overdueTrainings: number
    blockers: string[]
  }
  findings: LaborRiskFinding[]
  evidenceRequirements: LaborRiskEvidenceRequirement[]
  nextActions: RiskAction[]
  byArea: Array<{
    area: LaborRiskArea
    label: string
    findings: number
    exposureSoles: number
    avoidableSoles: number
    maxSeverity: LaborRiskSeverity
  }>
  sst: {
    score: number
    semaforo: SstScoreResult['semaforo']
    exposureSoles: number
    topRecommendations: SstScoreResult['recomendaciones']
  }
  inspectionPack: {
    readinessScore: number
    totalDocs: number
    applicableDocs: number
    incompleteDocs: number
    missingCriticalDocs: number
    potentialFineSoles: number
    estimatedAfterSubsanationSoles: number
    avoidableAmountSoles: number
    urgentDocs: LaborRiskEvidenceRequirement[]
  }
  legalConstants: {
    uit: number
    rmv: number
    versionDate: string
    sources: string[]
  }
}

export interface LaborRiskHistoryPoint {
  id: string
  calculatedAt: string
  scoreOverall: number
  scoreSunafilReady: number
  scoreSst: number
  scoreEvidence: number
  potentialFineSoles: number
  estimatedAfterSubsanationSoles: number
  avoidableAmountSoles: number
  totalFindings: number
  evidenceOpenDocs: number
}

export interface LaborRiskTrend {
  points: LaborRiskHistoryPoint[]
  deltaScore: number | null
  deltaExposureSoles: number | null
  deltaAvoidableSoles: number | null
  bestScore: number | null
  worstExposureSoles: number | null
}

interface TaskSignal {
  openTasks: number
  completedTasks: number
  completedWithEvidence: number
  openCriticalTasks: number
  unresolvedAlerts: number
  overdueTrainings: number
}

export async function evaluateLaborRisk(
  orgId: string,
  options: { mode?: LaborRiskMode; now?: Date } = {},
): Promise<LaborRiskSnapshot> {
  const now = options.now ?? new Date()
  const mode = options.mode ?? 'full'
  const [report, sstSnapshot, taskSignal, sunafilReady] = await Promise.all([
    scanOrgRisks(orgId),
    loadSstScoreSnapshot(orgId, now),
    loadTaskSignal(orgId, now),
    loadSunafilReadySignal(orgId, now).catch((error) => {
      console.error('[labor-risk evidence]', error)
      return null
    }),
  ])

  const sstScore = calcularScoreSst(sstSnapshot.snapshot, now)
  return buildLaborRiskSnapshot({ report, sstScore, taskSignal, sunafilReady, mode, now })
}

export function buildLaborRiskSnapshot(input: {
  report: OrgRiskReport
  sstScore: SstScoreResult
  taskSignal: TaskSignal
  sunafilReady?: SunafilReadySignal | null
  mode?: LaborRiskMode
  now?: Date
}): LaborRiskSnapshot {
  const now = input.now ?? new Date()
  const mode = input.mode ?? 'full'
  const findings = input.report.riesgos.map((risk) => mapFinding(risk, now))
  const evidenceRequirements = input.sunafilReady?.requirements ?? []
  const byArea = buildAreaSummary(findings)
  const taskSignal = input.taskSignal

  const sunafilReadyScore = input.sunafilReady?.scoreGlobal ?? clampScore(
    100 -
      input.report.resumen.muyGraves * 16 -
      input.report.resumen.graves * 9 -
      input.report.resumen.leves * 4,
  )
  const evidenceConfidence = computeEvidenceConfidence(findings, taskSignal, input.sunafilReady)
  const avoidableClosure = computeAvoidableClosure(taskSignal)
  const overall = clampScore(
    Math.round(sunafilReadyScore * 0.4 + input.sstScore.scoreGlobal * 0.25 + evidenceConfidence * 0.25 + avoidableClosure * 0.1),
  )
  const avoidableReductionPercent =
    input.report.totalMultaSoles > 0
      ? Math.round((input.report.ahorroTotalSoles / input.report.totalMultaSoles) * 100)
      : 100

  return {
    orgId: input.report.orgId,
    calculatedAt: now.toISOString(),
    mode,
    score: {
      overall,
      sunafilReady: sunafilReadyScore,
      sst: input.sstScore.scoreGlobal,
      evidenceConfidence,
      avoidableClosure,
    },
    exposure: {
      potentialFineSoles: input.report.totalMultaSoles,
      potentialFineUit: input.report.totalMultaUit,
      estimatedAfterSubsanationSoles: input.report.totalMultaConSubsanacionSoles,
      avoidableAmountSoles: input.report.ahorroTotalSoles,
      avoidableReductionPercent,
    },
    defense: {
      openTasks: taskSignal.openTasks,
      completedTasks: taskSignal.completedTasks,
      completedWithEvidence: taskSignal.completedWithEvidence,
      unresolvedAlerts: taskSignal.unresolvedAlerts,
      overdueTrainings: taskSignal.overdueTrainings,
      blockers: buildDefenseBlockers(findings, taskSignal, input.sunafilReady),
    },
    findings,
    evidenceRequirements,
    nextActions: buildNextActions(findings, evidenceRequirements, now),
    byArea,
    sst: {
      score: input.sstScore.scoreGlobal,
      semaforo: input.sstScore.semaforo,
      exposureSoles: input.sstScore.exposicionEconomica.totalSoles,
      topRecommendations: input.sstScore.recomendaciones.slice(0, 4),
    },
    inspectionPack: buildInspectionPack(input.sunafilReady, evidenceRequirements),
    legalConstants: {
      uit: UIT_2026,
      rmv: RMV_2026,
      versionDate: '2026-01-01',
      sources: [
        'D.S. 019-2006-TR - Reglamento de la Ley General de Inspeccion del Trabajo',
        'Ley 29783 - Seguridad y Salud en el Trabajo',
        'UIT 2026: S/ 5,500',
        'RMV vigente usada por el motor: S/ 1,130',
      ],
    },
  }
}

export async function persistLaborRiskSnapshot(
  snapshot: LaborRiskSnapshot,
  options: { force?: boolean; minMinutesBetweenSnapshots?: number } = {},
) {
  const minMinutes = options.minMinutesBetweenSnapshots ?? 240
  const calculatedAt = new Date(snapshot.calculatedAt)
  const latest = await prisma.laborRiskSnapshot.findFirst({
    where: { orgId: snapshot.orgId },
    orderBy: { calculatedAt: 'desc' },
    select: {
      id: true,
      calculatedAt: true,
      scoreOverall: true,
      potentialFineSoles: true,
      evidenceOpenDocs: true,
    },
  })

  if (!options.force && latest) {
    const minutes = (calculatedAt.getTime() - latest.calculatedAt.getTime()) / (60 * 1000)
    const sameRiskShape =
      latest.scoreOverall === snapshot.score.overall &&
      Number(latest.potentialFineSoles) === snapshot.exposure.potentialFineSoles &&
      latest.evidenceOpenDocs === snapshot.inspectionPack.incompleteDocs
    if (minutes >= 0 && minutes < minMinutes && sameRiskShape) {
      return latest
    }
  }

  const criticalFindings = snapshot.findings.filter((finding) => finding.severity === 'CRITICAL').length
  const highFindings = snapshot.findings.filter((finding) => finding.severity === 'HIGH').length
  return prisma.laborRiskSnapshot.create({
    data: {
      orgId: snapshot.orgId,
      mode: snapshot.mode,
      scoreOverall: snapshot.score.overall,
      scoreSunafilReady: snapshot.score.sunafilReady,
      scoreSst: snapshot.score.sst,
      scoreEvidence: snapshot.score.evidenceConfidence,
      scoreClosure: snapshot.score.avoidableClosure,
      potentialFineSoles: snapshot.exposure.potentialFineSoles,
      potentialFineUit: snapshot.exposure.potentialFineUit,
      estimatedAfterSubsanationSoles: snapshot.exposure.estimatedAfterSubsanationSoles,
      avoidableAmountSoles: snapshot.exposure.avoidableAmountSoles,
      avoidableReductionPercent: snapshot.exposure.avoidableReductionPercent,
      totalFindings: snapshot.findings.length,
      criticalFindings,
      highFindings,
      evidenceOpenDocs: snapshot.inspectionPack.incompleteDocs,
      evidenceCriticalDocs: snapshot.inspectionPack.missingCriticalDocs,
      openTasks: snapshot.defense.openTasks,
      unresolvedAlerts: snapshot.defense.unresolvedAlerts,
      snapshotJson: snapshotForStorage(snapshot) as unknown as Prisma.InputJsonValue,
      calculatedAt,
    },
    select: {
      id: true,
      calculatedAt: true,
      scoreOverall: true,
      potentialFineSoles: true,
      evidenceOpenDocs: true,
    },
  })
}

export async function loadLaborRiskTrend(orgId: string, take = 14): Promise<LaborRiskTrend> {
  const rows = await prisma.laborRiskSnapshot.findMany({
    where: { orgId },
    orderBy: { calculatedAt: 'desc' },
    take: Math.min(60, Math.max(2, take)),
    select: {
      id: true,
      calculatedAt: true,
      scoreOverall: true,
      scoreSunafilReady: true,
      scoreSst: true,
      scoreEvidence: true,
      potentialFineSoles: true,
      estimatedAfterSubsanationSoles: true,
      avoidableAmountSoles: true,
      totalFindings: true,
      evidenceOpenDocs: true,
    },
  })
  const points = rows.reverse().map((row) => ({
    id: row.id,
    calculatedAt: row.calculatedAt.toISOString(),
    scoreOverall: row.scoreOverall,
    scoreSunafilReady: row.scoreSunafilReady,
    scoreSst: row.scoreSst,
    scoreEvidence: row.scoreEvidence,
    potentialFineSoles: Number(row.potentialFineSoles),
    estimatedAfterSubsanationSoles: Number(row.estimatedAfterSubsanationSoles),
    avoidableAmountSoles: Number(row.avoidableAmountSoles),
    totalFindings: row.totalFindings,
    evidenceOpenDocs: row.evidenceOpenDocs,
  }))
  const first = points[0]
  const latestPoint = points.at(-1)
  return {
    points,
    deltaScore: first && latestPoint ? latestPoint.scoreOverall - first.scoreOverall : null,
    deltaExposureSoles: first && latestPoint ? latestPoint.potentialFineSoles - first.potentialFineSoles : null,
    deltaAvoidableSoles: first && latestPoint ? latestPoint.avoidableAmountSoles - first.avoidableAmountSoles : null,
    bestScore: points.length ? Math.max(...points.map((point) => point.scoreOverall)) : null,
    worstExposureSoles: points.length ? Math.max(...points.map((point) => point.potentialFineSoles)) : null,
  }
}

function snapshotForStorage(snapshot: LaborRiskSnapshot) {
  return {
    orgId: snapshot.orgId,
    calculatedAt: snapshot.calculatedAt,
    mode: snapshot.mode,
    score: snapshot.score,
    exposure: snapshot.exposure,
    defense: snapshot.defense,
    inspectionPack: {
      readinessScore: snapshot.inspectionPack.readinessScore,
      totalDocs: snapshot.inspectionPack.totalDocs,
      applicableDocs: snapshot.inspectionPack.applicableDocs,
      incompleteDocs: snapshot.inspectionPack.incompleteDocs,
      missingCriticalDocs: snapshot.inspectionPack.missingCriticalDocs,
      potentialFineSoles: snapshot.inspectionPack.potentialFineSoles,
      estimatedAfterSubsanationSoles: snapshot.inspectionPack.estimatedAfterSubsanationSoles,
      avoidableAmountSoles: snapshot.inspectionPack.avoidableAmountSoles,
      urgentDocs: snapshot.inspectionPack.urgentDocs.slice(0, 10),
    },
    findings: snapshot.findings.slice(0, 50),
    evidenceRequirements: snapshot.evidenceRequirements.slice(0, 50),
    nextActions: snapshot.nextActions,
    byArea: snapshot.byArea,
    sst: snapshot.sst,
    legalConstants: snapshot.legalConstants,
  }
}

async function loadTaskSignal(orgId: string, now: Date): Promise<TaskSignal> {
  const overdueThreshold = new Date(now)
  overdueThreshold.setDate(overdueThreshold.getDate() - 30)

  const [tasks, unresolvedAlerts, overdueTrainings] = await Promise.all([
    prisma.complianceTask.findMany({
      where: { orgId },
      select: {
        status: true,
        gravedad: true,
        evidenceUrl: true,
        _count: { select: { evidences: true } },
      },
    }),
    prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
    prisma.enrollment.count({
      where: {
        orgId,
        status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING', 'FAILED'] },
        createdAt: { lt: overdueThreshold },
        course: { isObligatory: true, isActive: true },
      },
    }),
  ])

  return {
    openTasks: tasks.filter((task) => task.status === 'PENDING' || task.status === 'IN_PROGRESS').length,
    completedTasks: tasks.filter((task) => task.status === 'COMPLETED').length,
    completedWithEvidence: tasks.filter(
      (task) => task.status === 'COMPLETED' && (Boolean(task.evidenceUrl) || task._count.evidences > 0),
    ).length,
    openCriticalTasks: tasks.filter(
      (task) =>
        (task.status === 'PENDING' || task.status === 'IN_PROGRESS') &&
        task.gravedad === 'MUY_GRAVE',
    ).length,
    unresolvedAlerts,
    overdueTrainings,
  }
}

async function loadSunafilReadySignal(orgId: string, now: Date): Promise<SunafilReadySignal> {
  const [totalWorkers, org] = await Promise.all([
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { sector: true, sizeRange: true },
    }),
  ])

  const applicabilityCtx = {
    totalWorkers,
    hasRiskActivities: isRiskSector(org?.sector),
    hasConstructionCivil: org?.sector?.toLowerCase().includes('construcci') ?? false,
    hasTercerizacion: false,
  }
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const [
    workerDocsAgg,
    orgDocs,
    sstRecords,
    sedes,
    ipercBases,
    comites,
    emos,
    workerEpps,
    capacitaciones,
    accidentes,
  ] = await Promise.all([
    prisma.workerDocument.findMany({
      where: {
        worker: { orgId, status: { not: 'TERMINATED' } },
        status: { in: ['UPLOADED', 'VERIFIED'] },
      },
      select: {
        workerId: true,
        documentType: true,
        expiresAt: true,
      },
    }),
    prisma.orgDocument.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
      select: {
        type: true,
        title: true,
        description: true,
        validUntil: true,
        updatedAt: true,
        fileUrl: true,
      },
    }),
    prisma.sstRecord.findMany({
      where: { orgId },
      select: { type: true, status: true, title: true, createdAt: true, completedAt: true, dueDate: true },
    }),
    prisma.sede.findMany({
      where: { orgId },
      select: { id: true, activa: true },
    }),
    prisma.iPERCBase.findMany({
      where: { orgId },
      select: { sedeId: true, estado: true, fechaAprobacion: true },
    }),
    prisma.comiteSST.findMany({
      where: { orgId },
      select: { estado: true, mandatoFin: true },
    }),
    prisma.eMO.findMany({
      where: { orgId },
      select: { workerId: true, proximoExamenAntes: true },
    }),
    prisma.workerEPP.findMany({
      where: { orgId },
      select: { workerId: true, fechaVencimiento: true },
    }),
    prisma.workerCapacitacionSST.findMany({
      where: { orgId, fechaCapacitacion: { gte: yearStart } },
      select: { workerId: true, tipo: true, fechaCapacitacion: true },
    }),
    prisma.accidente.findMany({
      where: { orgId },
      select: { id: true, fechaHora: true },
    }),
  ])

  const workerDocsByType = new Map<string, WorkerCoverageBucket>()
  for (const doc of workerDocsAgg) {
    const bucket = workerDocsByType.get(doc.documentType) ?? { present: new Set(), expired: new Set() }
    bucket.present.add(doc.workerId)
    if (doc.expiresAt && doc.expiresAt < now) {
      bucket.expired.add(doc.workerId)
    }
    workerDocsByType.set(doc.documentType, bucket)
  }

  const orgDocByType = new Map<string, { validUntil: Date | null; hasFile: boolean; updatedAt: Date | null }>()
  for (const doc of orgDocs) {
    if (!orgDocByType.has(doc.type)) {
      orgDocByType.set(doc.type, {
        validUntil: doc.validUntil,
        hasFile: Boolean(doc.fileUrl),
        updatedAt: doc.updatedAt,
      })
    }
  }

  const evidenceSnapshot: SunafilEvidenceSnapshot = {
    now,
    totalWorkers,
    workerDocsByType,
    orgDocByType,
    orgDocSearchText: orgDocs.map((doc) => `${doc.type} ${doc.title} ${doc.description ?? ''}`.toLowerCase()),
    sstRecords,
    sedes,
    ipercBases,
    comites,
    emos,
    workerEpps,
    capacitaciones,
    accidentes,
  }
  const tipoEmpresa = totalWorkers <= 10 ? 'MICRO' : totalWorkers <= 100 ? 'PEQUENA' : 'NO_MYPE'
  let applicableDocs = 0
  let completedDocs = 0
  let partialDocs = 0
  let missingDocs = 0
  let expiredDocs = 0
  let potentialFineSoles = 0
  const requirements: LaborRiskEvidenceRequirement[] = []

  for (const doc of SUNAFIL_READY_DOCS) {
    if (!isDocApplicable(doc, applicabilityCtx)) continue
    applicableDocs += 1
    const resolved = resolveSunafilDocStatus(doc, evidenceSnapshot)
    if (resolved.status === 'COMPLETO') {
      completedDocs += 1
      continue
    }
    if (resolved.status === 'PARCIAL') partialDocs += 1
    if (resolved.status === 'FALTANTE') missingDocs += 1
    if (resolved.status === 'VENCIDO') expiredDocs += 1
    if (resolved.status === 'NO_APLICA') continue

    const affected = resolved.status === 'PARCIAL'
      ? Math.max(1, resolved.coverage.total - resolved.coverage.present)
      : Math.max(1, resolved.coverage.total || 1)
    const fine = calcularMultaSunafilSoles(tipoEmpresa, doc.gravity, affected, false, null)
    potentialFineSoles += fine
    requirements.push(evidenceRequirementForDoc(doc, resolved.status, resolved, fine, now))
  }

  const estimatedAfterSubsanationSoles = roundMoney(potentialFineSoles * 0.1)
  return {
    totalDocs: SUNAFIL_READY_META.totalDocs,
    applicableDocs,
    completedDocs,
    partialDocs,
    missingDocs,
    expiredDocs,
    scoreGlobal: applicableDocs === 0 ? 100 : Math.round((completedDocs / applicableDocs) * 100),
    potentialFineSoles: roundMoney(potentialFineSoles),
    estimatedAfterSubsanationSoles,
    avoidableAmountSoles: roundMoney(potentialFineSoles - estimatedAfterSubsanationSoles),
    requirements: requirements.sort((a, b) => b.riskScore - a.riskScore || b.potentialFineSoles - a.potentialFineSoles),
  }
}

function evidenceRequirementForDoc(
  doc: SunafilDocSpec,
  status: Exclude<DocStatus, 'COMPLETO' | 'NO_APLICA'>,
  resolved: ReturnType<typeof resolveSunafilDocStatus>,
  potentialFineSoles: number,
  now: Date,
): LaborRiskEvidenceRequirement {
  const missingCount =
    resolved.coverage.total > 0
      ? Math.max(0, resolved.coverage.total - resolved.coverage.present)
      : status === 'FALTANTE'
        ? 1
        : 0
  const severity = severityFromGravity(doc.gravity)
  const statusWeight = status === 'VENCIDO' ? 18 : status === 'FALTANTE' ? 15 : 10
  const moneyWeight = potentialFineSoles >= 25_000 ? 14 : potentialFineSoles >= 10_000 ? 9 : potentialFineSoles >= 3_000 ? 5 : 2
  const gravityWeight = severity === 'CRITICAL' ? 20 : severity === 'HIGH' ? 12 : 6

  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    categoryLabel: CATEGORY_LABEL[doc.category],
    area: areaFromSunafilCategory(doc.category, doc.title),
    status,
    gravity: doc.gravity,
    severity,
    baseLegal: doc.baseLegal,
    coverage: resolved.coverage,
    missingCount,
    potentialFineSoles: roundMoney(potentialFineSoles),
    avoidableAmountSoles: roundMoney(potentialFineSoles * 0.9),
    actionHint: doc.actionHint,
    evidenceSources: resolved.evidenceSources,
    lastExpiresAt: resolved.lastExpiresAt?.toISOString() ?? null,
    route: routeForEvidenceDoc(doc),
    riskScore: clampScore(statusWeight + moneyWeight + gravityWeight + urgencyFromStatus(status, now, resolved.lastExpiresAt)),
  }
}

function isRiskSector(sector: string | null | undefined): boolean {
  if (!sector) return false
  const normalized = sector.toLowerCase()
  const risky = [
    'construcc',
    'miner',
    'pesc',
    'industr',
    'manufactur',
    'agro',
    'petroler',
    'electric',
    'quimic',
    'textile',
    'transport',
    'sanitari',
    'hospital',
    'salud',
  ]
  return risky.some((item) => normalized.includes(item))
}

function urgencyFromStatus(status: DocStatus, now: Date, expiresAt: Date | null): number {
  if (status === 'VENCIDO') return 14
  if (status === 'FALTANTE') return 10
  if (!expiresAt) return 0
  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 7) return 8
  if (days <= 30) return 4
  return 0
}

function mapFinding(risk: RiesgoDetectado, now: Date): LaborRiskFinding {
  const severity = severityFromGravity(risk.infraccion.severidad)
  const dueDate = suggestedDueDate(severity, now)
  const area = areaFromCategory(risk.infraccion.categoria)
  const riskScore = clampScore(
    risk.urgencia * 8 +
      (risk.ahorroSubsanacion >= 25_000 ? 14 : risk.ahorroSubsanacion >= 10_000 ? 9 : risk.ahorroSubsanacion >= 3_000 ? 5 : 0),
  )

  return {
    id: risk.infraccion.codigo,
    obligationId: risk.infraccion.codigo,
    area,
    title: risk.infraccion.titulo,
    severity,
    legalGravity: risk.infraccion.severidad,
    baseLegal: risk.infraccion.baseLegal,
    affectedEntities: risk.trabajadoresAfectados.map((item) => ({
      type: item.id === 'org' ? 'org' : 'worker',
      id: item.id,
      label: item.nombre,
    })),
    potentialFineSoles: risk.multaEstimadaSoles,
    potentialFineUit: risk.multaEstimadaUit,
    estimatedAfterSubsanationSoles: risk.multaConSubsanacionSoles,
    avoidableAmountSoles: risk.ahorroSubsanacion,
    confidence: confidenceForRisk(risk),
    evidenceSourcesChecked: evidenceSourcesForArea(area),
    missingEvidence: missingEvidenceForRisk(risk, area),
    action: risk.accionInmediata,
    suggestedOwnerRole: ownerForArea(area),
    suggestedDueDate: dueDate.toISOString(),
    route: routeForArea(area),
    riskScore,
  }
}

function severityFromGravity(gravity: LaborRiskGravity): LaborRiskSeverity {
  if (gravity === 'MUY_GRAVE') return 'CRITICAL'
  if (gravity === 'GRAVE') return 'HIGH'
  return 'MEDIUM'
}

function areaFromCategory(category: string): LaborRiskArea {
  const normalized = category.toUpperCase()
  if (normalized.includes('SST')) return 'SST'
  if (normalized.includes('SEGURIDAD_SOCIAL')) return 'SEGURIDAD_SOCIAL'
  if (normalized.includes('REMUNER')) return 'PLANILLA'
  if (normalized.includes('JORNADA')) return 'JORNADA'
  if (normalized.includes('IGUALDAD')) return 'IGUALDAD'
  if (normalized.includes('DOCUMENTOS')) return 'DOCUMENTOS'
  if (normalized.includes('TERCER')) return 'TERCEROS'
  if (normalized.includes('RELACIONES')) return 'CONTRATOS'
  return 'BENEFICIOS'
}

function suggestedDueDate(severity: LaborRiskSeverity, now: Date) {
  const days = severity === 'CRITICAL' ? 3 : severity === 'HIGH' ? 7 : severity === 'MEDIUM' ? 30 : 60
  const due = new Date(now)
  due.setDate(due.getDate() + days)
  return due
}

function confidenceForRisk(risk: RiesgoDetectado): LaborRiskConfidence {
  if (risk.trabajadoresAfectados.length > 0 && risk.trabajadoresAfectados.every((item) => item.id !== 'org')) {
    return 'HIGH'
  }
  if (risk.infraccion.categoria === 'SST') return 'MEDIUM'
  return 'HIGH'
}

function evidenceSourcesForArea(area: LaborRiskArea): string[] {
  if (area === 'SST') return ['IPERC', 'EMO', 'EPP', 'Comite SST', 'Capacitaciones SST', 'Accidentes SAT']
  if (area === 'CONTRATOS') return ['WorkerDocument', 'Contract', 'T-Registro', 'Legajo digital']
  if (area === 'PLANILLA') return ['Boletas', 'Planilla', 'Remuneracion registrada']
  if (area === 'SEGURIDAD_SOCIAL') return ['EsSalud', 'AFP/ONP', 'SCTR', 'Vida Ley']
  if (area === 'JORNADA') return ['Asistencia', 'Horario', 'Horas extra']
  if (area === 'IGUALDAD' || area === 'HSL') return ['Politicas', 'Canal de denuncias', 'Capacitaciones', 'Cuadro de categorias']
  return ['Documentos de organizacion', 'Tareas de compliance', 'Expediente SUNAFIL']
}

function missingEvidenceForRisk(risk: RiesgoDetectado, area: LaborRiskArea): string[] {
  const title = `${risk.infraccion.titulo} ${risk.accionInmediata}`.toLowerCase()
  if (title.includes('iperc')) return ['Matriz IPERC vigente por sede y aprobacion documentada.']
  if (title.includes('comite') || title.includes('supervisor')) return ['Acta de instalacion, miembros vigentes y evidencia de reuniones.']
  if (title.includes('capacit')) return ['Registro de asistencia, temario, evaluacion o certificado por trabajador.']
  if (title.includes('examen') || title.includes('emo')) return ['Certificado EMO vigente y aptitud del trabajador.']
  if (title.includes('epp')) return ['Cargo de entrega de EPP firmado y evidencia fotografica si aplica.']
  if (title.includes('t-registro')) return ['Constancia T-Registro o alta comunicada.']
  if (title.includes('contrato')) return ['Contrato/adenda firmada y vigencia documentada.']
  if (title.includes('boleta')) return ['Boleta de pago, cargo de entrega y constancia relacionada.']
  if (title.includes('hostigamiento')) return ['Politica/protocolo, canal y comunicacion interna con acuse.']
  if (area === 'SST') return ['Documento SST firmado y evidencia operativa asociada.']
  return ['Documento de subsanacion y evidencia trazable lista para inspeccion.']
}

function ownerForArea(area: LaborRiskArea): string {
  if (area === 'SST') return 'Responsable SST'
  if (area === 'PLANILLA' || area === 'BENEFICIOS') return 'Planilla / RR.HH.'
  if (area === 'CONTRATOS' || area === 'DOCUMENTOS') return 'RR.HH. / Legal'
  if (area === 'SEGURIDAD_SOCIAL') return 'Administracion / Planilla'
  if (area === 'IGUALDAD' || area === 'HSL') return 'RR.HH. / Comite'
  if (area === 'TERCEROS') return 'Compras / Legal'
  return 'Administrador de cumplimiento'
}

function routeForArea(area: LaborRiskArea): string {
  if (area === 'SST') return '/dashboard/sst'
  if (area === 'PLANILLA' || area === 'BENEFICIOS') return '/dashboard/planilla'
  if (area === 'CONTRATOS' || area === 'DOCUMENTOS') return '/dashboard/trabajadores'
  if (area === 'SEGURIDAD_SOCIAL') return '/dashboard/trabajadores'
  if (area === 'JORNADA') return '/dashboard/asistencia'
  if (area === 'IGUALDAD') return '/dashboard/igualdad-salarial'
  if (area === 'HSL') return '/dashboard/denuncias'
  if (area === 'TERCEROS') return '/dashboard/terceros'
  return '/dashboard/plan-accion'
}

function buildNextActions(
  findings: LaborRiskFinding[],
  evidenceRequirements: LaborRiskEvidenceRequirement[],
  now: Date,
): RiskAction[] {
  const findingActions = findings.map((finding) => ({
    id: finding.id,
    title: finding.action,
    area: finding.area,
    severity: finding.severity,
    impactSoles: finding.avoidableAmountSoles,
    dueDate: finding.suggestedDueDate,
    ownerRole: finding.suggestedOwnerRole,
    route: finding.route,
    evidenceGoal: finding.missingEvidence[0] ?? 'Evidencia de subsanacion cargada y trazable.',
  }))
  const evidenceActions = evidenceRequirements.map((requirement) => ({
    id: `evidence:${requirement.id}`,
    title:
      requirement.status === 'VENCIDO'
        ? `Renovar evidencia: ${requirement.title}`
        : `Preparar evidencia: ${requirement.title}`,
    area: requirement.area,
    severity: requirement.severity,
    impactSoles: requirement.avoidableAmountSoles,
    dueDate: suggestedDueDate(requirement.severity, now).toISOString(),
    ownerRole: ownerForArea(requirement.area),
    route: requirement.route,
    evidenceGoal: `${statusLabel(requirement.status)} · ${requirement.actionHint}`,
  }))

  return [...findingActions, ...evidenceActions]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.impactSoles - a.impactSoles)
    .slice(0, 6)
}

function buildInspectionPack(
  signal: SunafilReadySignal | null | undefined,
  requirements: LaborRiskEvidenceRequirement[],
): LaborRiskSnapshot['inspectionPack'] {
  const urgentDocs = requirements
    .filter((requirement) => requirement.severity === 'CRITICAL' || requirement.status === 'VENCIDO')
    .slice(0, 5)
  return {
    readinessScore: signal?.scoreGlobal ?? 0,
    totalDocs: signal?.totalDocs ?? SUNAFIL_READY_META.totalDocs,
    applicableDocs: signal?.applicableDocs ?? 0,
    incompleteDocs: signal ? signal.partialDocs + signal.missingDocs + signal.expiredDocs : requirements.length,
    missingCriticalDocs: requirements.filter((requirement) => requirement.severity === 'CRITICAL').length,
    potentialFineSoles: signal?.potentialFineSoles ?? 0,
    estimatedAfterSubsanationSoles: signal?.estimatedAfterSubsanationSoles ?? 0,
    avoidableAmountSoles: signal?.avoidableAmountSoles ?? 0,
    urgentDocs,
  }
}

function areaFromSunafilCategory(category: SunafilCategory, title: string): LaborRiskArea {
  if (category === 'SST') return 'SST'
  if (category === 'CONTRATOS_REGISTRO') return 'CONTRATOS'
  if (category === 'BOLETAS_REMUNERACIONES') return 'PLANILLA'
  if (category === 'PREVISIONAL') return 'SEGURIDAD_SOCIAL'
  if (category === 'JORNADA_ASISTENCIA') return 'JORNADA'
  if (category === 'VACACIONES') return 'BENEFICIOS'
  if (category === 'POLITICAS_OBLIGATORIAS') {
    const normalized = title.toLowerCase()
    if (normalized.includes('hostig')) return 'HSL'
    if (normalized.includes('igualdad') || normalized.includes('categor')) return 'IGUALDAD'
  }
  return 'DOCUMENTOS'
}

function routeForEvidenceDoc(doc: SunafilDocSpec): string {
  const docQuery = `sunafilDoc=${encodeURIComponent(doc.id)}`
  if (doc.category === 'SST') return `/dashboard/sst?${docQuery}`
  if (doc.category === 'CONTRATOS_REGISTRO') return `/dashboard/trabajadores?missingDoc=${encodeURIComponent(doc.workerDocType ?? doc.id)}`
  if (doc.category === 'BOLETAS_REMUNERACIONES') return `/dashboard/boletas?${docQuery}`
  if (doc.category === 'PREVISIONAL') return `/dashboard/trabajadores?missingDoc=${encodeURIComponent(doc.workerDocType ?? doc.id)}`
  if (doc.category === 'JORNADA_ASISTENCIA') return `/dashboard/asistencia?${docQuery}`
  if (doc.category === 'VACACIONES') return `/dashboard/vacaciones?${docQuery}`
  if (doc.category === 'POLITICAS_OBLIGATORIAS') return `/dashboard/documentos?${docQuery}`
  if (doc.generatorSlug && !doc.generatorSlug.endsWith('-export')) {
    return `/dashboard/generadores/${doc.generatorSlug}?${docQuery}`
  }
  return `/dashboard/sunafil-ready?doc=${encodeURIComponent(doc.id)}`
}

function buildAreaSummary(findings: LaborRiskFinding[]): LaborRiskSnapshot['byArea'] {
  const byArea = new Map<LaborRiskArea, LaborRiskSnapshot['byArea'][number]>()
  for (const finding of findings) {
    const current = byArea.get(finding.area) ?? {
      area: finding.area,
      label: labelForArea(finding.area),
      findings: 0,
      exposureSoles: 0,
      avoidableSoles: 0,
      maxSeverity: 'LOW' as LaborRiskSeverity,
    }
    current.findings += 1
    current.exposureSoles += finding.potentialFineSoles
    current.avoidableSoles += finding.avoidableAmountSoles
    current.maxSeverity = maxSeverity(current.maxSeverity, finding.severity)
    byArea.set(finding.area, current)
  }
  return [...byArea.values()]
    .map((item) => ({
      ...item,
      exposureSoles: Math.round(item.exposureSoles * 100) / 100,
      avoidableSoles: Math.round(item.avoidableSoles * 100) / 100,
    }))
    .sort((a, b) => b.exposureSoles - a.exposureSoles)
}

function labelForArea(area: LaborRiskArea): string {
  const labels: Record<LaborRiskArea, string> = {
    SST: 'SST',
    CONTRATOS: 'Contratos',
    PLANILLA: 'Planilla',
    BENEFICIOS: 'Beneficios',
    JORNADA: 'Jornada',
    SEGURIDAD_SOCIAL: 'Seguridad social',
    IGUALDAD: 'Igualdad',
    HSL: 'Hostigamiento',
    TERCEROS: 'Terceros',
    DOCUMENTOS: 'Documentos',
  }
  return labels[area]
}

function maxSeverity(a: LaborRiskSeverity, b: LaborRiskSeverity): LaborRiskSeverity {
  const order: Record<LaborRiskSeverity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
  return order[b] > order[a] ? b : a
}

function computeEvidenceConfidence(
  findings: LaborRiskFinding[],
  taskSignal: TaskSignal,
  signal?: SunafilReadySignal | null,
) {
  if (
    findings.length === 0 &&
    taskSignal.unresolvedAlerts === 0 &&
    taskSignal.overdueTrainings === 0 &&
    (!signal || signal.missingDocs + signal.expiredDocs + signal.partialDocs === 0)
  ) return 100
  const pressure = Math.min(
    75,
    findings.reduce((sum, finding) => {
      if (finding.severity === 'CRITICAL') return sum + 14
      if (finding.severity === 'HIGH') return sum + 8
      if (finding.severity === 'MEDIUM') return sum + 4
      return sum + 2
    }, 0) +
      taskSignal.unresolvedAlerts * 4 +
      taskSignal.overdueTrainings * 4 +
      (signal ? signal.missingDocs * 5 + signal.expiredDocs * 6 + signal.partialDocs * 3 : 0),
  )
  const docBonus = signal?.applicableDocs
    ? Math.round((signal.completedDocs / signal.applicableDocs) * 18)
    : 0
  const evidenceBonus = Math.min(35, taskSignal.completedWithEvidence * 6 + docBonus)
  const openPenalty = Math.min(20, taskSignal.openCriticalTasks * 5)
  return clampScore(100 - pressure - openPenalty + evidenceBonus)
}

function computeAvoidableClosure(taskSignal: TaskSignal) {
  const total = taskSignal.openTasks + taskSignal.completedTasks + taskSignal.unresolvedAlerts + taskSignal.overdueTrainings
  if (total === 0) return 100
  return clampScore(Math.round((taskSignal.completedWithEvidence / total) * 100))
}

function buildDefenseBlockers(
  findings: LaborRiskFinding[],
  taskSignal: TaskSignal,
  signal?: SunafilReadySignal | null,
) {
  const blockers: string[] = []
  const critical = findings.filter((finding) => finding.severity === 'CRITICAL').length
  if (critical > 0) blockers.push(`${critical} riesgo(s) criticos siguen sin cierre defensivo.`)
  const criticalEvidence = signal?.requirements.filter((requirement) => requirement.severity === 'CRITICAL').length ?? 0
  if (criticalEvidence > 0) blockers.push(`${criticalEvidence} documento(s) SUNAFIL criticos siguen incompletos.`)
  if (signal?.expiredDocs) blockers.push(`${signal.expiredDocs} documento(s) clave estan vencidos para una inspeccion.`)
  if (taskSignal.openTasks > 0) blockers.push(`${taskSignal.openTasks} tarea(s) abiertas requieren responsable, plazo o evidencia.`)
  if (taskSignal.unresolvedAlerts > 0) blockers.push(`${taskSignal.unresolvedAlerts} alerta(s) sin resolver pueden convertirse en hallazgos.`)
  if (taskSignal.overdueTrainings > 0) blockers.push(`${taskSignal.overdueTrainings} capacitacion(es) obligatorias estan vencidas.`)
  if (taskSignal.completedTasks > taskSignal.completedWithEvidence) {
    blockers.push('Hay tareas cerradas sin evidencia adjunta; no deberian contarse como defensa plena.')
  }
  return blockers.slice(0, 5)
}

function statusLabel(status: DocStatus): string {
  if (status === 'COMPLETO') return 'Completo'
  if (status === 'PARCIAL') return 'Parcial'
  if (status === 'FALTANTE') return 'Faltante'
  if (status === 'VENCIDO') return 'Vencido'
  return 'No aplica'
}

function severityRank(severity: LaborRiskSeverity): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[severity]
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
