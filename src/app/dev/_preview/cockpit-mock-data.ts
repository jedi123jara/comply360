/**
 * Datos de EJEMPLO para /dev/cockpit.
 *
 * Tienen la misma forma que `getCockpitFullPayload()` (src/lib/cockpit/data.ts)
 * pero no consultan la base. Solo se importan TIPOS de ese módulo (se borran
 * al compilar), así Prisma nunca llega al bundle del cliente.
 *
 * Escenarios:
 *   - `normal`: empresa con datos y un par de alertas críticas.
 *   - `alerta`: además hay trabajadores fuera de planilla (banner rojo).
 *   - `vacio`: cuenta nueva sin trabajadores (pantalla de primeros pasos).
 */

import type {
  StartRouteProgress,
  CockpitFullPayload,
  CockpitRiskSummary,
  CockpitStats,
  ComplianceTasksSummary,
  HeatmapDayItem,
  ScoreSnapshot,
} from '@/lib/cockpit/data'
import { PREVIEW_ORG } from './mock-api'

export type CockpitScenario = 'normal' | 'alerta' | 'vacio'

export const COCKPIT_SCENARIOS: ReadonlyArray<{
  id: CockpitScenario
  label: string
  hint: string
}> = [
  { id: 'normal', label: 'Con datos', hint: 'Empresa en marcha con alertas puntuales' },
  { id: 'alerta', label: 'Con alerta crítica', hint: 'Trabajadores fuera de planilla' },
  { id: 'vacio', label: 'Cuenta nueva', hint: 'Sin trabajadores todavía' },
]

export function parseCockpitScenario(value: string | null | undefined): CockpitScenario {
  return value === 'alerta' || value === 'vacio' ? value : 'normal'
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Fecha a las 12:00 UTC de hoy + `days`, para que servidor y navegador coincidan. */
function dayAtNoonUtc(days: number): string {
  const now = new Date()
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)
  return new Date(base + days * DAY_MS).toISOString()
}

/** 1.º del mes actual a las 00:00 hora de Lima (05:00 UTC), igual que el payload real. */
function startOfMonthLimaIso(): string {
  const now = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 5)).toISOString()
}

function buildHeatmap(): HeatmapDayItem[] {
  // Serie determinista (sin Math.random) para evitar diferencias de hidratación.
  return Array.from({ length: 84 }, (_, index) => {
    const count = (index * 7 + 3) % 6
    return {
      date: dayAtNoonUtc(index - 83).slice(0, 10),
      value: Math.min(4, count),
      count,
    }
  })
}

const SCORE_SNAPSHOT: ScoreSnapshot = {
  scoreGlobal: 78,
  delta: 4,
  history: [
    { month: '2026-05', score: 66 },
    { month: '2026-06', score: 69 },
    { month: '2026-07', score: 71 },
    { month: '2026-08', score: 72 },
    { month: '2026-09', score: 74 },
    { month: '2026-10', score: 78 },
  ],
  breakdown: [
    { label: 'Contratos', score: 88, weight: 20 },
    { label: 'Legajo', score: 82, weight: 15 },
    { label: 'CTS', score: 95, weight: 15 },
    { label: 'Gratificaciones', score: 90, weight: 10 },
    { label: 'Vacaciones', score: 76, weight: 10 },
    { label: 'SST', score: 54, weight: 15 },
    { label: 'Documentos', score: 70, weight: 15 },
  ],
  topRisk: { label: 'SST incompleto', impact: 6 },
}

const EMPTY_SCORE: ScoreSnapshot = {
  scoreGlobal: null,
  delta: 0,
  history: [],
  breakdown: [],
  topRisk: null,
}

function buildStats(scenario: CockpitScenario): CockpitStats {
  if (scenario === 'vacio') {
    return {
      totalContracts: 0,
      totalWorkers: 0,
      activeContracts: 0,
      draftContracts: 0,
      inReviewContracts: 0,
      expiredContracts: 0,
      expiringCount: 0,
      calculationsThisMonth: 0,
      criticalAlerts: 0,
      templatesAvailable: 3,
      complianceScore: null,
      multaPotencial: null,
      avgLegajoScore: null,
      totalPlanilla: 0,
      workersAtRisk: 0,
      workersProtected: 0,
      daysSinceOrgCreated: 1,
      ownerFirstName: PREVIEW_ORG.ownerFirstName,
      orgName: PREVIEW_ORG.name,
      plan: 'PRO',
      totalWorkersDeclared: null,
      subdeclarationGap: null,
    }
  }

  return {
    totalContracts: 38,
    totalWorkers: PREVIEW_ORG.totalWorkers,
    activeContracts: 34,
    draftContracts: 2,
    inReviewContracts: 1,
    expiredContracts: 1,
    expiringCount: 4,
    calculationsThisMonth: 12,
    criticalAlerts: scenario === 'alerta' ? 5 : 3,
    templatesAvailable: 9,
    complianceScore: SCORE_SNAPSHOT.scoreGlobal,
    multaPotencial: 24_500,
    avgLegajoScore: 81,
    totalPlanilla: 98_350,
    workersAtRisk: 5,
    workersProtected: 39,
    daysSinceOrgCreated: 186,
    ownerFirstName: PREVIEW_ORG.ownerFirstName,
    orgName: PREVIEW_ORG.name,
    plan: 'PRO',
    totalWorkersDeclared: scenario === 'alerta' ? PREVIEW_ORG.totalWorkers + 3 : PREVIEW_ORG.totalWorkers,
    subdeclarationGap: scenario === 'alerta' ? 3 : null,
  }
}

function buildTasks(scenario: CockpitScenario): ComplianceTasksSummary {
  if (scenario === 'vacio') {
    return {
      open: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      dismissed: 0,
      overdue: 0,
      multaEvitable: 0,
      multaEvitada: 0,
      multaEvitadaDesde: startOfMonthLimaIso(),
      top: [],
    }
  }

  return {
    open: 7,
    pending: 5,
    inProgress: 2,
    completed: 14,
    dismissed: 1,
    overdue: 1,
    multaEvitable: 24_500,
    multaEvitada: 18_450,
    multaEvitadaDesde: startOfMonthLimaIso(),
    top: [
      {
        id: 'tarea-ejemplo-1',
        title: 'Actualizar el IPERC de los puestos de almacén',
        area: 'sst',
        areaLabel: 'Seguridad y salud en el trabajo',
        href: '/dashboard/sst',
        gravedad: 'MUY_GRAVE',
        priority: 1,
        multaEvitable: 12_600,
        dueDate: dayAtNoonUtc(3),
        overdue: false,
      },
      {
        id: 'tarea-ejemplo-2',
        title: 'Renovar 2 contratos a plazo fijo que vencen este mes',
        area: 'contratos_registro',
        areaLabel: 'Contratos y registro',
        href: '/dashboard/contratos',
        gravedad: 'GRAVE',
        priority: 2,
        multaEvitable: 8_635,
        dueDate: dayAtNoonUtc(9),
        overdue: false,
      },
      {
        id: 'tarea-ejemplo-3',
        title: 'Subir la constancia de capacitación en hostigamiento',
        area: 'documentos_obligatorios',
        areaLabel: 'Documentos obligatorios',
        href: '/dashboard/plan-accion',
        gravedad: 'LEVE',
        priority: 3,
        multaEvitable: 1_265,
        dueDate: null,
        overdue: false,
      },
    ],
  }
}

function buildRiskSummary(scenario: CockpitScenario, tasks: ComplianceTasksSummary): CockpitRiskSummary {
  if (scenario === 'vacio') {
    return { latestDiagnostic: null, multaAlertasAbiertas: 0, multaPendiente: 0, focusAction: null }
  }

  const multaAlertasAbiertas = scenario === 'alerta' ? 9_900 : 4_950
  const focusTask = tasks.top[0]
  return {
    latestDiagnostic: {
      id: 'diagnostico-ejemplo',
      type: 'EXPRESS',
      scoreGlobal: SCORE_SNAPSHOT.scoreGlobal ?? 0,
      completedAt: dayAtNoonUtc(-12),
    },
    multaAlertasAbiertas,
    multaPendiente: tasks.multaEvitable + multaAlertasAbiertas,
    focusAction: focusTask
      ? {
          kind: 'task',
          id: focusTask.id,
          title: focusTask.title,
          areaLabel: focusTask.areaLabel,
          workerName: null,
          href: focusTask.href,
          multaEvitable: focusTask.multaEvitable,
          dueDate: focusTask.dueDate,
          overdue: focusTask.overdue,
        }
      : null,
  }
}

export function buildCockpitMock(scenario: CockpitScenario): CockpitFullPayload {
  const stats = buildStats(scenario)
  const empty = scenario === 'vacio'
  const scoreSnapshot = empty ? EMPTY_SCORE : SCORE_SNAPSHOT
  const complianceTasks = buildTasks(scenario)

  return {
    org: {
      id: PREVIEW_ORG.id,
      name: PREVIEW_ORG.name,
      plan: 'PRO',
      planExpiresAt: null,
    },
    stats,
    riskWorkers: empty
      ? []
      : [
          { id: 'w-ejemplo-1', fullName: 'Juan García López', role: 'Analista de Operaciones', regimen: 'MYPE Pequeña', score: 48, openAlerts: 3 },
          { id: 'w-ejemplo-2', fullName: 'Ana Pérez Quispe', role: 'Supervisora SST', regimen: 'General', score: 55, openAlerts: 2 },
          { id: 'w-ejemplo-3', fullName: 'Roberto Mamani Flores', role: 'Conductor', regimen: 'General', score: 62, openAlerts: 1 },
        ],
    upcomingDeadlines: empty
      ? []
      : [
          { id: 'v-ejemplo-1', label: 'Contrato a plazo fijo — Juan García', dueIn: 3, category: 'contract', href: '/dashboard/contratos' },
          { id: 'v-ejemplo-2', label: 'Examen médico ocupacional — Ana Pérez', dueIn: 6, category: 'sst', href: '/dashboard/sst' },
          { id: 'v-ejemplo-3', label: 'Depósito de CTS de noviembre', dueIn: 41, category: 'cts', amount: 24_500, href: '/dashboard/calendario' },
        ],
    activityHeatmap: empty ? [] : buildHeatmap(),
    sectorRadar: empty
      ? []
      : SCORE_SNAPSHOT.breakdown.map((item, index) => ({
          area: item.label,
          org: item.score,
          sector: [78, 72, 80, 79, 75, 68, 66][index] ?? 70,
        })),
    complianceTasks,
    recentCriticalAlerts: empty
      ? []
      : [
          {
            id: 'a-ejemplo-1',
            type: 'EXAMEN_MEDICO_VENCIDO',
            severity: 'CRITICAL',
            title: 'Examen médico ocupacional vencido',
            dueDate: dayAtNoonUtc(-2),
            multaEstimada: 4_950,
            createdAt: dayAtNoonUtc(-5),
            workerId: 'w-ejemplo-2',
            workerName: 'Ana Pérez Quispe',
          },
        ],
    recentContracts: empty
      ? []
      : [
          {
            id: 'c-ejemplo-1',
            title: 'Contrato a plazo fijo — Juan García',
            type: 'PLAZO_FIJO',
            status: 'SIGNED',
            updatedAt: dayAtNoonUtc(-1),
          },
        ],
    topRisk: scoreSnapshot.topRisk,
    scoreSnapshot,
    complianceBreakdown: scoreSnapshot.breakdown,
    riskSummary: buildRiskSummary(scenario, complianceTasks),
    startRoute: buildStartRoute(scenario),
  }
}

/** Avance de la ruta de arranque (datos de ejemplo). */
function buildStartRoute(scenario: CockpitScenario): StartRouteProgress {
  if (scenario === 'vacio') {
    return {
      orgMissingFields: ['sector'],
      resolvedTasks: 0,
      resolvedAlerts: 0,
      multaReducida: 0,
      openAlerts: 0,
      legajoDocs: 0,
      legajoWorker: null,
    }
  }
  return {
    orgMissingFields: [],
    resolvedTasks: 2,
    resolvedAlerts: 1,
    multaReducida: 4950,
    openAlerts: 3,
    legajoDocs: 0,
    legajoWorker: { id: 'w-ejemplo-1', name: 'Juan García', legajoScore: 0 },
  }
}
