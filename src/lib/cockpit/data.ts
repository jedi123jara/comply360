/**
 * Cockpit data layer — funciones server-side reutilizables.
 *
 * Extraídas del route handler `/api/dashboard` para que el Server Component
 * del cockpit (`/dashboard/page.tsx`) las pueda consumir directo sin pasar
 * por HTTP. El route handler sigue funcionando para clientes externos
 * (Chrome extension, mobile app futura) y delega aquí.
 *
 * Cada función es independiente: Server Components pueden envolver una sola
 * en `<Suspense>` para streaming progresivo. Errores se propagan — el caller
 * decide si los captura con ErrorBoundary o no.
 */

import { prisma } from '@/lib/prisma'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import { resolveTaskRoute } from '@/lib/compliance/task-route-resolver'
import { computeActionRiskScore, type ActionPlanSeverity } from '@/lib/compliance/action-plan'
import { getLimaParts } from '@/lib/time/lima'
import type { Prisma } from '@/generated/prisma/client'

const DAY_MS = 1000 * 60 * 60 * 24

/** Ruta de respaldo cuando una tarea no tiene una pantalla específica donde resolverse. */
const PLAN_ACCION_HREF = '/dashboard/plan-accion'

// ─────────────────────────────────────────────────────────────────────────────
// Types públicos consumidos por componentes del cockpit
// ─────────────────────────────────────────────────────────────────────────────

export interface CockpitStats {
  totalContracts: number
  totalWorkers: number
  activeContracts: number
  draftContracts: number
  inReviewContracts: number
  expiredContracts: number
  expiringCount: number
  calculationsThisMonth: number
  criticalAlerts: number
  templatesAvailable: number
  complianceScore: number | null
  multaPotencial: number | null
  avgLegajoScore: number | null
  totalPlanilla: number
  workersAtRisk: number
  workersProtected: number
  /**
   * Días desde que se creó la cuenta. NO equivale a "días sin multa": la
   * plataforma no sabe si la empresa fue multada. Se mantiene solo por
   * compatibilidad con consumidores del API.
   */
  daysSinceOrgCreated: number
  ownerFirstName: string | null
  orgName: string | null
  plan: string
  totalWorkersDeclared: number | null
  subdeclarationGap: number | null
}

export interface CockpitOrgMeta {
  id: string
  name: string | null
  plan: string
  planExpiresAt: Date | null
}

export interface RiskWorkerItem {
  id: string
  fullName: string
  role?: string
  regimen?: string
  score: number
  openAlerts: number
}

export interface UpcomingDeadlineItem {
  id: string
  label: string
  dueIn: number
  category: 'contract' | 'cts' | 'grat' | 'sst' | 'afp' | 'document' | 'other'
  amount?: number
  href: string
}

export interface HeatmapDayItem {
  date: string
  value: number
  count: number
}

export interface SectorRadarItem {
  area: string
  org: number
  sector: number
}

export interface ComplianceTaskTeaser {
  id: string
  title: string
  /** Clave interna del área (ej. "sst", "contratos_registro"). */
  area: string
  /** Nombre legible del área (ej. "Seguridad y salud en el trabajo"). */
  areaLabel: string
  /** Pantalla donde se resuelve la tarea; si no hay una específica, el plan de acción. */
  href: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  priority: number
  multaEvitable: number | null
  dueDate: string | null
  overdue: boolean
}

export interface ComplianceTasksSummary {
  open: number
  pending: number
  inProgress: number
  completed: number
  dismissed: number
  overdue: number
  /** Suma de multas de las tareas abiertas (PENDING + IN_PROGRESS). */
  multaEvitable: number
  /** Suma de multas de las tareas completadas en el mes calendario actual (hora de Lima). */
  multaEvitada: number
  /** Inicio del mes que cubre `multaEvitada` (ISO, 00:00 hora de Lima). */
  multaEvitadaDesde: string
  top: ComplianceTaskTeaser[]
}

/** Último diagnóstico (o simulacro) completado por la empresa. */
export interface CockpitDiagnosticSummary {
  id: string
  type: 'FULL' | 'EXPRESS' | 'SIMULATION'
  scoreGlobal: number
  completedAt: string
}

/** La única acción que el panel recomienda hacer hoy. */
export interface CockpitFocusAction {
  kind: 'task' | 'alert'
  id: string
  title: string
  /** Área en palabras, lista para mostrar. */
  areaLabel: string
  /** Trabajador involucrado (solo para alertas). */
  workerName: string | null
  /** Ruta directa donde se resuelve. */
  href: string
  multaEvitable: number | null
  dueDate: string | null
  overdue: boolean
}

/** Resumen de riesgo que alimenta la cabecera del panel. */
export interface CockpitRiskSummary {
  latestDiagnostic: CockpitDiagnosticSummary | null
  /** Multas estimadas de las alertas abiertas de trabajadores (todas las severidades). */
  multaAlertasAbiertas: number
  /**
   * Lo que hoy te podrían multar según lo detectado: tareas abiertas del
   * diagnóstico + alertas abiertas. Es la misma base que usa el plan de acción.
   */
  multaPendiente: number
  focusAction: CockpitFocusAction | null
}

export interface RecentCriticalAlert {
  id: string
  type: string
  severity: string
  title: string
  dueDate: string | null
  multaEstimada: number | null
  createdAt: string
  workerId: string
  workerName: string
}

export interface RecentContract {
  id: string
  title: string
  type: string
  status: string
  updatedAt: string
}

export interface ScoreSnapshot {
  scoreGlobal: number | null
  delta: number
  history: Array<{ month: string; score: number }>
  breakdown: Array<{ label: string; score: number; weight?: number }>
  topRisk: { label: string; impact: number } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OrgMeta + Stats (combinados — comparten queries)
// ─────────────────────────────────────────────────────────────────────────────

interface OrgMetaInternal {
  meta: CockpitOrgMeta
  ownerFirstName: string | null
  totalWorkersDeclared: number | null
  createdAt: Date
}

async function getOrgMetaInternal(orgId: string): Promise<OrgMetaInternal | null> {
  const orgMeta = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      plan: true,
      planExpiresAt: true,
      createdAt: true,
      totalWorkersDeclared: true,
      users: {
        where: { role: 'OWNER' },
        select: { firstName: true, lastName: true },
        take: 1,
      },
    },
  })
  if (!orgMeta) return null
  return {
    meta: {
      id: orgMeta.id,
      name: orgMeta.name ?? null,
      plan: orgMeta.plan ?? 'FREE',
      planExpiresAt: orgMeta.planExpiresAt ?? null,
    },
    ownerFirstName: orgMeta.users?.[0]?.firstName ?? null,
    totalWorkersDeclared: orgMeta.totalWorkersDeclared ?? null,
    createdAt: orgMeta.createdAt ?? new Date(),
  }
}

export async function getCockpitOrgMeta(orgId: string): Promise<CockpitOrgMeta | null> {
  const i = await getOrgMetaInternal(orgId)
  return i?.meta ?? null
}

export async function getCockpitStats(orgId: string): Promise<CockpitStats> {
  const [
    contractCounts,
    totalContracts,
    calculationCount,
    alertCount,
    templateCount,
    totalWorkers,
    workerAgg,
    workersAtRiskIds,
    expiringContracts,
    orgMetaInternal,
    complianceScoreResult,
  ] = await Promise.all([
    prisma.contract.groupBy({ by: ['status'], where: { orgId }, _count: true }),
    prisma.contract.count({ where: { orgId } }),
    prisma.calculation.count({
      where: {
        orgId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
    }),
    prisma.contractTemplate.count({ where: { isActive: true } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.worker.aggregate({
      where: { orgId, status: 'ACTIVE' },
      _avg: { sueldoBruto: true, legajoScore: true },
      _sum: { sueldoBruto: true },
    }),
    prisma.worker.findMany({
      where: {
        orgId,
        status: { not: 'TERMINATED' },
        OR: [
          { legajoScore: { lt: 60 } },
          { alerts: { some: { resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } } } },
        ],
      },
      select: { id: true },
    }),
    prisma.contract.findMany({
      where: {
        orgId,
        expiresAt: { lte: new Date(Date.now() + 30 * DAY_MS), gte: new Date() },
        status: { notIn: ['EXPIRED', 'ARCHIVED'] },
      },
      select: { id: true },
    }),
    getOrgMetaInternal(orgId),
    calculateComplianceScore(orgId).catch(() => null),
  ])

  const statusMap: Record<string, number> = {}
  for (const c of contractCounts) statusMap[c.status] = c._count

  const workersAtRiskCount = workersAtRiskIds.length
  const workersBlindados = Math.max(0, totalWorkers - workersAtRiskCount)
  const orgCreatedAt = orgMetaInternal?.createdAt ?? new Date()
  const diasDesdeCreacion = Math.max(
    0,
    Math.floor((Date.now() - orgCreatedAt.getTime()) / DAY_MS),
  )
  const totalWorkersDeclared = orgMetaInternal?.totalWorkersDeclared ?? null
  const subdeclarationGap =
    totalWorkersDeclared !== null
      ? Math.max(0, totalWorkersDeclared - totalWorkers)
      : null

  return {
    totalContracts,
    totalWorkers,
    activeContracts: statusMap['SIGNED'] ?? 0,
    draftContracts: statusMap['DRAFT'] ?? 0,
    inReviewContracts: statusMap['IN_REVIEW'] ?? 0,
    expiredContracts: statusMap['EXPIRED'] ?? 0,
    expiringCount: expiringContracts.length,
    calculationsThisMonth: calculationCount,
    criticalAlerts: alertCount,
    templatesAvailable: templateCount,
    complianceScore: complianceScoreResult?.scoreGlobal ?? null,
    multaPotencial: complianceScoreResult?.multaPotencial ?? null,
    avgLegajoScore: workerAgg._avg.legajoScore
      ? Math.round(Number(workerAgg._avg.legajoScore))
      : null,
    totalPlanilla: workerAgg._sum.sueldoBruto ? Number(workerAgg._sum.sueldoBruto) : 0,
    workersAtRisk: workersAtRiskCount,
    workersProtected: workersBlindados,
    daysSinceOrgCreated: diasDesdeCreacion,
    ownerFirstName: orgMetaInternal?.ownerFirstName ?? null,
    orgName: orgMetaInternal?.meta.name ?? null,
    plan: orgMetaInternal?.meta.plan ?? 'FREE',
    totalWorkersDeclared,
    subdeclarationGap,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Risk workers
// ─────────────────────────────────────────────────────────────────────────────

export async function getRiskWorkers(orgId: string): Promise<RiskWorkerItem[]> {
  const raw = await prisma.worker.findMany({
    where: { orgId, status: { not: 'TERMINATED' } },
    orderBy: [{ legajoScore: 'asc' }, { updatedAt: 'desc' }],
    take: 20,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      regimenLaboral: true,
      legajoScore: true,
      alerts: {
        where: { resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
        select: { id: true },
      },
    },
  })
  return raw
    .map((w) => ({
      id: w.id,
      fullName: `${w.firstName ?? ''} ${w.lastName ?? ''}`.trim() || 'Trabajador',
      role: w.position ?? undefined,
      regimen: w.regimenLaboral ?? undefined,
      score: w.legajoScore ?? 0,
      openAlerts: w.alerts.length,
      riskRank: 100 - (w.legajoScore ?? 0) + w.alerts.length * 8,
    }))
    .sort((a, b) => b.riskRank - a.riskRank)
    .slice(0, 5)
    .map(({ riskRank, ...rest }) => {
      void riskRank
      return rest
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Upcoming deadlines
// ─────────────────────────────────────────────────────────────────────────────

function categorizeAlertType(raw: string): UpcomingDeadlineItem['category'] {
  const t = raw.toLowerCase()
  if (t.includes('contrato')) return 'contract'
  if (t.includes('cts')) return 'cts'
  if (t.includes('grat')) return 'grat'
  if (t.includes('sst') || t.includes('exam') || t.includes('epp')) return 'sst'
  if (t.includes('afp')) return 'afp'
  if (t.includes('doc')) return 'document'
  return 'other'
}

export async function getUpcomingDeadlines(orgId: string): Promise<UpcomingDeadlineItem[]> {
  const nowMs = Date.now()
  const toDays = (d: Date | null) =>
    d ? Math.ceil((d.getTime() - nowMs) / DAY_MS) : 99

  const [alertDeadlines, expiringContracts] = await Promise.all([
    prisma.workerAlert.findMany({
      where: { orgId, resolvedAt: null, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        dueDate: true,
        multaEstimada: true,
      },
    }),
    prisma.contract.findMany({
      where: {
        orgId,
        expiresAt: { lte: new Date(nowMs + 30 * DAY_MS), gte: new Date() },
        status: { notIn: ['EXPIRED', 'ARCHIVED'] },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
      select: { id: true, title: true, expiresAt: true },
    }),
  ])

  const merged: UpcomingDeadlineItem[] = [
    ...alertDeadlines.map((a) => ({
      id: `alert-${a.id}`,
      label: a.title,
      dueIn: toDays(a.dueDate),
      category: categorizeAlertType(a.type),
      amount: a.multaEstimada ? Number(a.multaEstimada) : undefined,
      href: '/dashboard/alertas',
    })),
    ...expiringContracts.map((c) => ({
      id: `contract-${c.id}`,
      label: c.title,
      dueIn: toDays(c.expiresAt),
      category: 'contract' as const,
      href: `/dashboard/contratos/${c.id}`,
    })),
  ]

  return merged.sort((a, b) => a.dueIn - b.dueIn).slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Activity heatmap
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivityHeatmap(orgId: string): Promise<HeatmapDayItem[]> {
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * DAY_MS)
  twelveWeeksAgo.setHours(0, 0, 0, 0)

  const [auditActivity, calcActivity] = await Promise.all([
    prisma.auditLog
      .findMany({
        where: { orgId, createdAt: { gte: twelveWeeksAgo } },
        select: { createdAt: true },
        take: 2000,
      })
      .catch(() => []),
    prisma.calculation.findMany({
      where: { orgId, createdAt: { gte: twelveWeeksAgo } },
      select: { createdAt: true },
      take: 2000,
    }),
  ])

  const byDay = new Map<string, number>()
  for (const e of [...auditActivity, ...calcActivity]) {
    const iso = e.createdAt.toISOString().slice(0, 10)
    byDay.set(iso, (byDay.get(iso) ?? 0) + 1)
  }

  const heatmap: HeatmapDayItem[] = []
  for (let i = 0; i < 12 * 7; i++) {
    const d = new Date(twelveWeeksAgo)
    d.setDate(twelveWeeksAgo.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const count = byDay.get(iso) ?? 0
    const intensity = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
    heatmap.push({ date: iso, value: intensity, count })
  }
  return heatmap
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Compliance score snapshot (current + history + delta + topRisk)
// ─────────────────────────────────────────────────────────────────────────────

export async function getComplianceScoreSnapshot(orgId: string): Promise<ScoreSnapshot> {
  const result = await calculateComplianceScore(orgId).catch(() => null)
  const breakdown = result?.breakdown ?? []

  // Historial de los últimos 6 meses (snapshots persistidos)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const snapshots = await prisma.complianceScore
    .findMany({
      where: { orgId, calculatedAt: { gte: sixMonthsAgo } },
      orderBy: { calculatedAt: 'asc' },
      select: { scoreGlobal: true, calculatedAt: true },
    })
    .catch(() => [])

  // Agrupar por mes (último snapshot del mes gana)
  const byMonth = new Map<string, number>()
  for (const s of snapshots) {
    const month = s.calculatedAt.toISOString().slice(0, 7) // YYYY-MM
    byMonth.set(month, s.scoreGlobal)
  }
  const history = Array.from(byMonth.entries())
    .map(([month, score]) => ({ month, score }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Delta: score actual vs último mes anterior
  const delta =
    result && history.length >= 2
      ? result.scoreGlobal - history[history.length - 2].score
      : 0

  // Top risk: peor área del breakdown
  const worst = breakdown.length
    ? [...breakdown].sort((a, b) => a.score - b.score)[0]
    : null
  const topRisk = worst
    ? {
        label: worst.label,
        impact: Math.max(
          0,
          Math.round((90 - worst.score) * ((worst.weight ?? 15) / 100)),
        ),
      }
    : null

  return {
    scoreGlobal: result?.scoreGlobal ?? null,
    delta,
    history,
    breakdown,
    topRisk,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sector radar
// ─────────────────────────────────────────────────────────────────────────────

export async function getSectorRadar(
  orgId: string,
  breakdown: Array<{ label: string; score: number; weight?: number }>,
): Promise<SectorRadarItem[]> {
  if (!breakdown.length) return []

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { sector: true },
  })
  if (!org?.sector) return []

  const peers = await prisma.organization.findMany({
    where: { sector: org.sector, id: { not: orgId } },
    select: { id: true },
    take: 200,
  })
  if (peers.length === 0) return []

  const sectorBench = await prisma.complianceScore.findMany({
    where: { orgId: { in: peers.map((p) => p.id) } },
    orderBy: { calculatedAt: 'desc' },
    take: 50,
    select: {
      scoreContratos: true,
      scoreSst: true,
      scoreDocumentos: true,
      scoreVencimientos: true,
      scorePlanilla: true,
    },
  })
  if (sectorBench.length === 0) return []

  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0
  const avgOf = (
    key:
      | 'scoreContratos'
      | 'scoreSst'
      | 'scoreDocumentos'
      | 'scoreVencimientos'
      | 'scorePlanilla',
  ) => avg(sectorBench.map((r) => r[key] ?? 0).filter((v) => v > 0))

  const byLabel = Object.fromEntries(breakdown.map((b) => [b.label, b.score]))
  return [
    { area: 'Contratos', org: byLabel['Contratos'] ?? 0, sector: avgOf('scoreContratos') },
    { area: 'SST', org: byLabel['SST'] ?? 0, sector: avgOf('scoreSst') },
    { area: 'Documentos', org: byLabel['Documentos'] ?? 0, sector: avgOf('scoreDocumentos') },
    { area: 'Vencimientos', org: byLabel['Vencimientos'] ?? 0, sector: avgOf('scoreVencimientos') },
    { area: 'Planilla', org: byLabel['Planilla'] ?? 0, sector: avgOf('scorePlanilla') },
  ].filter((r) => r.sector > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Compliance task stats (degrada con try/catch a zeros si la tabla no existe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instante UTC del 1.º del mes calendario actual a las 00:00 hora de Lima.
 * Perú no tiene horario de verano: 00:00 Lima = 05:00 UTC.
 */
export function startOfMonthLima(now: Date = new Date()): Date {
  const { year, month } = getLimaParts(now)
  return new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0))
}

/** Nombres legibles de las áreas de `ComplianceTask.area` (diagnóstico + organigrama). */
const TASK_AREA_LABELS: Record<string, string> = {
  contratos_registro: 'Contratos y registro',
  remuneraciones_beneficios: 'Remuneraciones y beneficios',
  jornada_descansos: 'Jornada y descansos',
  sst: 'Seguridad y salud en el trabajo',
  documentos_obligatorios: 'Documentos obligatorios',
  relaciones_laborales: 'Relaciones laborales',
  igualdad_nodiscriminacion: 'Igualdad y no discriminación',
  trabajadores_especiales: 'Trabajadores con protección especial',
  tercerizacion_intermediacion: 'Tercerización e intermediación',
  hostigamiento_sexual_detallado: 'Prevención del hostigamiento sexual',
  organigrama: 'Organigrama y comités',
}

function humanizeKey(raw: string): string {
  const text = raw.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

/** Convierte la clave de área de una tarea en un nombre legible. */
export function taskAreaLabel(area: string | null | undefined): string {
  if (!area) return 'General'
  return TASK_AREA_LABELS[area] ?? (humanizeKey(area) || 'General')
}

/** Área legible por tipo de alerta (`WorkerAlertType`). El orden importa: gana el primer match. */
const ALERT_AREA_RULES: Array<{ test: (type: string) => boolean; label: string }> = [
  { test: (t) => t.includes('CONTRATO') || t.includes('ADENDA'), label: 'Contratos' },
  { test: (t) => t.includes('CTS') || t.includes('GRATIFICACION'), label: 'Remuneraciones y beneficios' },
  { test: (t) => t.includes('VACACIONES'), label: 'Vacaciones' },
  { test: (t) => t.startsWith('T_REGISTRO'), label: 'Registro en planilla electrónica' },
  { test: (t) => t.includes('AFP'), label: 'Aportes previsionales' },
  { test: (t) => t.includes('SCTR'), label: 'Seguros obligatorios' },
  { test: (t) => t.includes('TARDANZA') || t.includes('AUSENTISMO'), label: 'Asistencia' },
  { test: (t) => t.includes('LICENCIA'), label: 'Licencias y descansos médicos' },
  { test: (t) => t.includes('DOCUMENTO') || t.includes('REGISTRO'), label: 'Legajo del trabajador' },
  {
    test: (t) =>
      t.includes('EXAMEN') ||
      t.startsWith('EMO_') ||
      t.includes('CAPACITACION') ||
      t.includes('IPERC') ||
      t.startsWith('SAT_') ||
      t.includes('COMITE') ||
      t.includes('SIMULACRO'),
    label: 'Seguridad y salud en el trabajo',
  },
]

/** Convierte un tipo de alerta de trabajador en un área legible. */
export function alertAreaLabel(type: string | null | undefined): string {
  const t = (type ?? '').toUpperCase()
  if (!t) return 'Alerta de trabajador'
  return ALERT_AREA_RULES.find((rule) => rule.test(t))?.label ?? (humanizeKey(t) || 'Alerta de trabajador')
}

/** Ruta donde se resuelve una tarea; cae al plan de acción si no hay una específica. */
export function taskHref(task: { sourceId: string | null; area: string }): string {
  return resolveTaskRoute({ sourceId: task.sourceId, area: task.area })?.href ?? PLAN_ACCION_HREF
}

export async function getComplianceTaskStats(orgId: string): Promise<ComplianceTasksSummary> {
  const now = new Date()
  const monthStart = startOfMonthLima(now)
  const empty: ComplianceTasksSummary = {
    open: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    dismissed: 0,
    overdue: 0,
    multaEvitable: 0,
    multaEvitada: 0,
    multaEvitadaDesde: monthStart.toISOString(),
    top: [],
  }

  try {
    const [taskCountsRaw, openMultaAgg, completedMultaAgg, overdueCount, topTasks] =
      await Promise.all([
        prisma.complianceTask.groupBy({
          by: ['status'],
          where: { orgId },
          _count: true,
        }),
        prisma.complianceTask.aggregate({
          where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          _sum: { multaEvitable: true },
        }),
        // "Multa evitada este mes": solo tareas cerradas desde el 1.º del mes
        // (hora de Lima). `completedAt` lo setean todos los flujos que cierran
        // tareas (PATCH /api/compliance-tasks y /api/plan-accion).
        prisma.complianceTask.aggregate({
          where: { orgId, status: 'COMPLETED', completedAt: { gte: monthStart } },
          _sum: { multaEvitable: true },
        }),
        prisma.complianceTask.count({
          where: {
            orgId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { not: null, lt: new Date() },
          },
        }),
        prisma.complianceTask.findMany({
          where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
          // 4 = la acción del día + las 3 siguientes que lista el panel.
          take: 4,
          select: {
            id: true,
            title: true,
            area: true,
            sourceId: true,
            gravedad: true,
            multaEvitable: true,
            priority: true,
            status: true,
            dueDate: true,
          },
        }),
      ])

    const taskCountsMap = Object.fromEntries(
      taskCountsRaw.map((c) => [c.status, c._count]),
    ) as Record<string, number>

    return {
      open: (taskCountsMap['PENDING'] ?? 0) + (taskCountsMap['IN_PROGRESS'] ?? 0),
      pending: taskCountsMap['PENDING'] ?? 0,
      inProgress: taskCountsMap['IN_PROGRESS'] ?? 0,
      completed: taskCountsMap['COMPLETED'] ?? 0,
      dismissed: taskCountsMap['DISMISSED'] ?? 0,
      overdue: overdueCount,
      multaEvitable: Number(openMultaAgg._sum.multaEvitable ?? 0),
      multaEvitada: Number(completedMultaAgg._sum.multaEvitable ?? 0),
      multaEvitadaDesde: monthStart.toISOString(),
      top: topTasks.map((t) => ({
        id: t.id,
        title: t.title,
        area: t.area,
        areaLabel: taskAreaLabel(t.area),
        href: taskHref({ sourceId: t.sourceId ?? null, area: t.area }),
        gravedad: t.gravedad as 'LEVE' | 'GRAVE' | 'MUY_GRAVE',
        priority: t.priority,
        multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : null,
        dueDate: t.dueDate?.toISOString() ?? null,
        overdue: t.dueDate !== null && t.dueDate < now,
      })),
    }
  } catch (err) {
    console.warn(
      '[cockpit/data] complianceTask queries failed:',
      err instanceof Error ? err.message : err,
    )
    return empty
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Recent critical alerts + recent contracts (para banners y MomentCards)
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentCriticalAlerts(orgId: string): Promise<RecentCriticalAlert[]> {
  const alerts = await prisma.workerAlert.findMany({
    where: { orgId, resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    take: 5,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      dueDate: true,
      multaEstimada: true,
      createdAt: true,
      worker: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  return alerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    dueDate: a.dueDate?.toISOString() ?? null,
    multaEstimada: a.multaEstimada ? Number(a.multaEstimada) : null,
    createdAt: a.createdAt.toISOString(),
    workerId: a.worker.id,
    workerName: `${a.worker.firstName} ${a.worker.lastName}`,
  }))
}

export async function getRecentContracts(orgId: string): Promise<RecentContract[]> {
  const recent = await prisma.contract.findMany({
    where: { orgId },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      updatedAt: true,
    },
  })
  return recent.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Resumen de riesgo para la cabecera: diagnóstico, multas pendientes y la
//    única acción recomendada para hoy
// ─────────────────────────────────────────────────────────────────────────────

/** Último diagnóstico/simulacro completado, o null si la empresa nunca hizo uno. */
export async function getLatestDiagnostic(orgId: string): Promise<CockpitDiagnosticSummary | null> {
  const diagnostic = await prisma.complianceDiagnostic.findFirst({
    where: { orgId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    select: { id: true, type: true, scoreGlobal: true, completedAt: true },
  })
  if (!diagnostic?.completedAt) return null
  return {
    id: diagnostic.id,
    type: diagnostic.type as CockpitDiagnosticSummary['type'],
    scoreGlobal: diagnostic.scoreGlobal,
    completedAt: diagnostic.completedAt.toISOString(),
  }
}

/** Suma de `multaEstimada` de las alertas de trabajadores sin resolver. */
export async function getOpenAlertsMulta(orgId: string): Promise<number> {
  const agg = await prisma.workerAlert.aggregate({
    where: { orgId, resolvedAt: null },
    _sum: { multaEstimada: true },
  })
  return Number(agg._sum.multaEstimada ?? 0)
}

const GRAVEDAD_TO_SEVERITY: Record<ComplianceTaskTeaser['gravedad'], ActionPlanSeverity> = {
  MUY_GRAVE: 'CRITICAL',
  GRAVE: 'HIGH',
  LEVE: 'MEDIUM',
}

function toSeverity(raw: string): ActionPlanSeverity {
  return raw === 'CRITICAL' || raw === 'HIGH' || raw === 'MEDIUM' || raw === 'LOW' ? raw : 'MEDIUM'
}

/**
 * Elige UNA acción para "¿Qué hago hoy?" entre las tareas abiertas y las
 * alertas graves, con el mismo puntaje de riesgo que usa el plan de acción
 * (gravedad + plazo + multa). En empate gana la primera candidata: las tareas
 * llegan ordenadas por prioridad del diagnóstico.
 */
export function pickFocusAction(
  tasks: ComplianceTaskTeaser[],
  alerts: RecentCriticalAlert[],
  now: Date = new Date(),
): CockpitFocusAction | null {
  const candidates: Array<{ action: CockpitFocusAction; risk: number }> = []

  for (const task of tasks) {
    candidates.push({
      risk: computeActionRiskScore(
        {
          severity: GRAVEDAD_TO_SEVERITY[task.gravedad] ?? 'MEDIUM',
          dueDate: task.dueDate,
          multaEvitable: task.multaEvitable,
          source: 'task',
        },
        now,
      ),
      action: {
        kind: 'task',
        id: task.id,
        title: task.title,
        areaLabel: task.areaLabel,
        workerName: null,
        href: task.href,
        multaEvitable: task.multaEvitable,
        dueDate: task.dueDate,
        overdue: task.overdue,
      },
    })
  }

  for (const alert of alerts) {
    const due = alert.dueDate ? new Date(alert.dueDate) : null
    candidates.push({
      risk: computeActionRiskScore(
        {
          severity: toSeverity(alert.severity),
          dueDate: alert.dueDate,
          multaEvitable: alert.multaEstimada,
          source: 'alert',
        },
        now,
      ),
      action: {
        kind: 'alert',
        id: alert.id,
        title: alert.title,
        areaLabel: alertAreaLabel(alert.type),
        workerName: alert.workerName.trim() || null,
        // Las alertas se resuelven corrigiendo los datos del trabajador.
        href: `/dashboard/trabajadores/${alert.workerId}`,
        multaEvitable: alert.multaEstimada,
        dueDate: alert.dueDate,
        overdue: due !== null && !Number.isNaN(due.getTime()) && due < now,
      },
    })
  }

  let best: (typeof candidates)[number] | null = null
  for (const candidate of candidates) {
    if (!best || candidate.risk > best.risk) best = candidate
  }
  return best?.action ?? null
}

export function buildRiskSummary(input: {
  latestDiagnostic: CockpitDiagnosticSummary | null
  complianceTasks: ComplianceTasksSummary
  recentCriticalAlerts: RecentCriticalAlert[]
  multaAlertasAbiertas: number
  now?: Date
}): CockpitRiskSummary {
  const multaTareas = Math.max(0, input.complianceTasks.multaEvitable || 0)
  const multaAlertas = Math.max(0, input.multaAlertasAbiertas || 0)
  return {
    latestDiagnostic: input.latestDiagnostic,
    multaAlertasAbiertas: multaAlertas,
    multaPendiente: multaTareas + multaAlertas,
    focusAction: pickFocusAction(
      input.complianceTasks.top,
      input.recentCriticalAlerts,
      input.now ?? new Date(),
    ),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Ruta de arranque (primeros pasos): datos reales de avance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lo que la ruta de arranque necesita y no viene ya en el resto del payload
 * (trabajadores y diagnóstico salen de `stats` y `riskSummary`).
 */
export interface StartRouteProgress {
  /** Datos de la empresa que faltan, en palabras ("RUC", "sector"...). Vacío = completos. */
  orgMissingFields: string[]
  /** Pendientes resueltos de verdad: tareas completadas + alertas marcadas como resueltas. */
  resolvedTasks: number
  resolvedAlerts: number
  /** Multa estimada de lo resuelto (tareas + alertas), en soles. */
  multaReducida: number
  /** Alertas de trabajadores sin resolver (las tareas abiertas vienen en `complianceTasks.open`). */
  openAlerts: number
  /** Documentos subidos o verificados en legajos de trabajadores activos. */
  legajoDocs: number
  /** Trabajador con el legajo más avanzado (o el primero registrado si nadie subió nada). */
  legajoWorker: { id: string; name: string; legajoScore: number } | null
}

const RUC_PATTERN = /^\d{11}$/

/** Datos mínimos de la empresa para saber qué normas le aplican. */
export function missingOrgFields(org: {
  ruc: string | null
  razonSocial: string | null
  name: string | null
  sector: string | null
  regimenPrincipal: string | null
} | null): string[] {
  if (!org) return ['RUC', 'razón social', 'sector', 'régimen laboral']
  const missing: string[] = []
  if (!org.ruc || !RUC_PATTERN.test(org.ruc.trim())) missing.push('RUC')
  if (!(org.razonSocial?.trim() || org.name?.trim())) missing.push('razón social')
  if (!org.sector?.trim()) missing.push('sector')
  if (!org.regimenPrincipal?.trim()) missing.push('régimen laboral')
  return missing
}

export async function getStartRouteProgress(orgId: string): Promise<StartRouteProgress> {
  const activeWorker = { orgId, status: { not: 'TERMINATED' as const }, deletedAt: null }

  const [org, completedTasks, resolvedAlerts, openAlerts, legajoDocs, legajoWorker] =
    await Promise.all([
      prisma.organization
        .findUnique({
          where: { id: orgId },
          select: { ruc: true, razonSocial: true, name: true, sector: true, regimenPrincipal: true },
        })
        .catch(() => null),
      // La tabla de tareas puede no existir en entornos viejos: degradamos a 0.
      prisma.complianceTask
        .aggregate({
          where: { orgId, status: 'COMPLETED' },
          _count: { _all: true },
          _sum: { multaEvitable: true },
        })
        .catch(() => null),
      // Solo las resueltas a propósito: el motor de alertas BORRA (no resuelve)
      // las que dejan de aplicar, así que esto no infla el avance.
      prisma.workerAlert
        .aggregate({
          where: { orgId, resolvedAt: { not: null } },
          _count: { _all: true },
          _sum: { multaEstimada: true },
        })
        .catch(() => null),
      prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }).catch(() => 0),
      prisma.workerDocument
        .count({ where: { status: { in: ['UPLOADED', 'VERIFIED'] }, worker: activeWorker } })
        .catch(() => 0),
      prisma.worker
        .findFirst({
          where: activeWorker,
          orderBy: [{ legajoScore: { sort: 'desc', nulls: 'last' } }, { createdAt: 'asc' }],
          select: { id: true, firstName: true, lastName: true, legajoScore: true },
        })
        .catch(() => null),
    ])

  const multaTareas = Number(completedTasks?._sum.multaEvitable ?? 0)
  const multaAlertas = Number(resolvedAlerts?._sum.multaEstimada ?? 0)

  return {
    orgMissingFields: missingOrgFields(org),
    resolvedTasks: completedTasks?._count._all ?? 0,
    resolvedAlerts: resolvedAlerts?._count._all ?? 0,
    multaReducida: Math.max(0, multaTareas) + Math.max(0, multaAlertas),
    openAlerts,
    legajoDocs,
    legajoWorker: legajoWorker
      ? {
          id: legajoWorker.id,
          name: `${legajoWorker.firstName ?? ''} ${legajoWorker.lastName ?? ''}`.trim() || 'tu trabajador',
          legajoScore: legajoWorker.legajoScore ?? 0,
        }
      : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Agregadora — usada por el route handler para no romper API contract
// ─────────────────────────────────────────────────────────────────────────────

export interface CockpitFullPayload {
  org: CockpitOrgMeta | null
  stats: CockpitStats
  riskWorkers: RiskWorkerItem[]
  upcomingDeadlines: UpcomingDeadlineItem[]
  activityHeatmap: HeatmapDayItem[]
  sectorRadar: SectorRadarItem[]
  complianceTasks: ComplianceTasksSummary
  recentCriticalAlerts: RecentCriticalAlert[]
  recentContracts: RecentContract[]
  topRisk: { label: string; impact: number } | null
  scoreSnapshot: ScoreSnapshot
  complianceBreakdown: Array<{ label: string; score: number; weight?: number }>
  riskSummary: CockpitRiskSummary
  /** Avance de la ruta de arranque. Opcional para no romper payloads de ejemplo. */
  startRoute?: StartRouteProgress
}

export async function getCockpitFullPayload(orgId: string): Promise<CockpitFullPayload> {
  // Score se calcula primero porque sectorRadar depende de su breakdown.
  const scoreSnapshot = await getComplianceScoreSnapshot(orgId)

  const [
    orgMeta,
    stats,
    riskWorkers,
    upcomingDeadlines,
    activityHeatmap,
    sectorRadar,
    complianceTasks,
    recentCriticalAlerts,
    recentContracts,
    latestDiagnostic,
    multaAlertasAbiertas,
    startRoute,
  ] = await Promise.all([
    getCockpitOrgMeta(orgId),
    getCockpitStats(orgId),
    getRiskWorkers(orgId),
    getUpcomingDeadlines(orgId),
    getActivityHeatmap(orgId),
    getSectorRadar(orgId, scoreSnapshot.breakdown),
    getComplianceTaskStats(orgId),
    getRecentCriticalAlerts(orgId),
    getRecentContracts(orgId),
    getLatestDiagnostic(orgId),
    getOpenAlertsMulta(orgId),
    getStartRouteProgress(orgId),
  ])

  const riskSummary = buildRiskSummary({
    latestDiagnostic,
    complianceTasks,
    recentCriticalAlerts,
    multaAlertasAbiertas,
  })

  return {
    org: orgMeta,
    stats,
    riskWorkers,
    upcomingDeadlines,
    activityHeatmap,
    sectorRadar,
    complianceTasks,
    recentCriticalAlerts,
    recentContracts,
    topRisk: scoreSnapshot.topRisk,
    scoreSnapshot,
    complianceBreakdown: scoreSnapshot.breakdown,
    riskSummary,
    startRoute,
  }
}

// Tipo helper para imports cuando se necesite el Prisma Decimal
export type { Prisma }
