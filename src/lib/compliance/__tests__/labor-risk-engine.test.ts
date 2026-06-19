import { describe, expect, it, vi } from 'vitest'
import { buildLaborRiskSnapshot } from '../labor-risk-engine'
import type { OrgRiskReport } from '../risk-scanner'
import type { SstScoreResult } from '@/lib/sst/scoring'
import type { SunafilReadySignal } from '../labor-risk-engine'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

const now = new Date('2026-05-25T10:00:00.000Z')

function makeReport(): OrgRiskReport {
  return {
    orgId: 'org_1',
    scanDate: now,
    tipoEmpresa: 'PEQUENA',
    totalTrabajadores: 18,
    totalMultaSoles: 50_000,
    totalMultaUit: 9.09,
    totalMultaConSubsanacionSoles: 5_000,
    ahorroTotalSoles: 45_000,
    resumen: {
      muyGraves: 1,
      graves: 1,
      leves: 0,
      riesgosCriticos: [],
      areasMasRiesgosas: ['SST'],
    },
    riesgos: [
      {
        infraccion: {
          codigo: 'DS019-28.2',
          categoria: 'SST',
          severidad: 'GRAVE',
          titulo: 'No realizar IPERC',
          descripcion: 'No se ha elaborado IPERC.',
          baseLegal: 'D.S. 019-2006-TR Art. 28.2',
          articuloDs019: '28.2',
          deteccionAutomatica: true,
          umbralTrabajadores: null,
          prioridadFiscalizacion: 1,
          subsanacion: 'Elaborar Matriz IPERC por puesto de trabajo.',
        },
        trabajadoresAfectados: [{ id: 'org', nombre: 'Organizacion', detalle: 'Sin IPERC' }],
        multaEstimadaSoles: 20_000,
        multaEstimadaUit: 3.64,
        multaConSubsanacionSoles: 2_000,
        ahorroSubsanacion: 18_000,
        accionInmediata: 'Crear IPERC vigente y cargar evidencia.',
        urgencia: 8,
      },
      {
        infraccion: {
          codigo: 'DS019-26.1',
          categoria: 'SEGURIDAD_SOCIAL',
          severidad: 'MUY_GRAVE',
          titulo: 'No inscripcion en EsSalud',
          descripcion: 'Trabajadores sin EsSalud.',
          baseLegal: 'D.S. 019-2006-TR Art. 26.1',
          articuloDs019: '26.1',
          deteccionAutomatica: true,
          umbralTrabajadores: null,
          prioridadFiscalizacion: 1,
          subsanacion: 'Registrar trabajadores en EsSalud.',
        },
        trabajadoresAfectados: [{ id: 'w1', nombre: 'Ana Perez', detalle: 'Sin EsSalud' }],
        multaEstimadaSoles: 30_000,
        multaEstimadaUit: 5.45,
        multaConSubsanacionSoles: 3_000,
        ahorroSubsanacion: 27_000,
        accionInmediata: 'Regularizar EsSalud y dejar constancia.',
        urgencia: 10,
      },
    ],
  }
}

const sstScore: SstScoreResult = {
  scoreGlobal: 64,
  semaforo: 'AMARILLO',
  breakdown: {
    iperc: { score: 8, max: 25, nota: 'IPERC parcial' },
    emo: { score: 20, max: 20, nota: 'EMO ok' },
    sat: { score: 15, max: 15, nota: 'SAT ok' },
    comite: { score: 10, max: 15, nota: 'Comite parcial' },
    fieldAudit: { score: 6, max: 15, nota: 'Sin auditorias' },
    sedes: { score: 5, max: 10, nota: 'Sedes parciales' },
  },
  exposicionEconomica: {
    totalSoles: 20_000,
    detalle: [],
  },
  recomendaciones: [
    {
      prioridad: 'HIGH',
      area: 'IPERC',
      titulo: 'Crear matriz IPERC',
      detalle: 'Falta IPERC vigente.',
      impactoSoles: 20_000,
    },
  ],
}

const sunafilReady: SunafilReadySignal = {
  totalDocs: 28,
  applicableDocs: 20,
  completedDocs: 10,
  partialDocs: 1,
  missingDocs: 8,
  expiredDocs: 1,
  scoreGlobal: 50,
  potentialFineSoles: 12_000,
  estimatedAfterSubsanationSoles: 1_200,
  avoidableAmountSoles: 10_800,
  requirements: [
    {
      id: 'iperc',
      title: 'Matriz IPERC',
      category: 'SST',
      categoryLabel: 'Seguridad y Salud en el Trabajo',
      area: 'SST',
      status: 'FALTANTE',
      gravity: 'MUY_GRAVE',
      severity: 'CRITICAL',
      baseLegal: 'Ley 29783',
      coverage: { present: 0, total: 1 },
      missingCount: 1,
      potentialFineSoles: 12_000,
      avoidableAmountSoles: 10_800,
      actionHint: 'Generar IPERC y cargar evidencia.',
      evidenceSources: [],
      lastExpiresAt: null,
      route: '/dashboard/sst',
      riskScore: 90,
    },
  ],
}

describe('buildLaborRiskSnapshot', () => {
  it('combina escaneo, SST, evidencia y acciones en una foto canonica', () => {
    const snapshot = buildLaborRiskSnapshot({
      report: makeReport(),
      sstScore,
      sunafilReady,
      now,
      taskSignal: {
        openTasks: 2,
        completedTasks: 3,
        completedWithEvidence: 2,
        openCriticalTasks: 1,
        unresolvedAlerts: 1,
        overdueTrainings: 0,
      },
    })

    expect(snapshot.exposure.avoidableAmountSoles).toBe(45_000)
    expect(snapshot.exposure.avoidableReductionPercent).toBe(90)
    expect(snapshot.findings[0].area).toBe('SST')
    expect(snapshot.findings[1].severity).toBe('CRITICAL')
    expect(snapshot.nextActions[0].impactSoles).toBeGreaterThan(0)
    expect(snapshot.score.sst).toBe(64)
    expect(snapshot.score.sunafilReady).toBe(50)
    expect(snapshot.score.overall).toBeGreaterThanOrEqual(0)
    expect(snapshot.evidenceRequirements[0].title).toBe('Matriz IPERC')
    expect(snapshot.nextActions.some((action) => action.id === 'evidence:iperc')).toBe(true)
    expect(snapshot.inspectionPack.incompleteDocs).toBe(10)
    expect(snapshot.defense.blockers.length).toBeGreaterThan(0)
  })
})
