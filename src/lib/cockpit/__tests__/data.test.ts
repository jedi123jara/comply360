/**
 * Tests del data layer del panel principal (src/lib/cockpit/data.ts).
 *
 * Cubre lo que alimenta la cabecera:
 *  - "Multa evitada este mes" filtra de verdad por el mes calendario de Lima.
 *  - Las tareas traen área legible y ruta específica para resolverlas.
 *  - La acción del día se elige con el mismo puntaje de riesgo del plan de acción.
 *  - La multa pendiente suma tareas abiertas + alertas abiertas.
 */

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    complianceTask: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    complianceDiagnostic: {
      findFirst: vi.fn(),
    },
    workerAlert: {
      aggregate: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/compliance/score-calculator', () => ({
  calculateComplianceScore: vi.fn().mockResolvedValue(null),
}))

import {
  alertAreaLabel,
  buildRiskSummary,
  getComplianceTaskStats,
  getLatestDiagnostic,
  getOpenAlertsMulta,
  pickFocusAction,
  startOfMonthLima,
  taskAreaLabel,
  taskHref,
  type ComplianceTaskTeaser,
  type ComplianceTasksSummary,
  type RecentCriticalAlert,
} from '../data'

function task(overrides: Partial<ComplianceTaskTeaser> = {}): ComplianceTaskTeaser {
  return {
    id: 'task-1',
    title: 'Implementar IPERC firmado',
    area: 'sst',
    areaLabel: 'Seguridad y salud en el trabajo',
    href: '/dashboard/sst',
    gravedad: 'LEVE',
    priority: 1,
    multaEvitable: null,
    dueDate: null,
    overdue: false,
    ...overrides,
  }
}

function alert(overrides: Partial<RecentCriticalAlert> = {}): RecentCriticalAlert {
  return {
    id: 'alert-1',
    type: 'CONTRATO_VENCIDO',
    severity: 'CRITICAL',
    title: 'Contrato vencido',
    dueDate: null,
    multaEstimada: null,
    createdAt: '2026-10-01T15:00:00.000Z',
    workerId: 'worker-1',
    workerName: 'Ana Pérez',
    ...overrides,
  }
}

function summary(overrides: Partial<ComplianceTasksSummary> = {}): ComplianceTasksSummary {
  return {
    open: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    dismissed: 0,
    overdue: 0,
    multaEvitable: 0,
    multaEvitada: 0,
    multaEvitadaDesde: '2026-10-01T05:00:00.000Z',
    top: [],
    ...overrides,
  }
}

describe('startOfMonthLima', () => {
  it('devuelve el 1.º del mes a las 00:00 de Lima (05:00 UTC)', () => {
    expect(startOfMonthLima(new Date('2026-10-05T12:00:00Z')).toISOString()).toBe('2026-10-01T05:00:00.000Z')
  })

  it('usa el mes de Lima aunque en UTC ya sea el mes siguiente', () => {
    // 2026-11-01 03:00 UTC = 2026-10-31 22:00 en Lima → sigue siendo octubre.
    expect(startOfMonthLima(new Date('2026-11-01T03:00:00Z')).toISOString()).toBe('2026-10-01T05:00:00.000Z')
  })

  it('cruza el año correctamente', () => {
    expect(startOfMonthLima(new Date('2027-01-01T04:59:00Z')).toISOString()).toBe('2026-12-01T05:00:00.000Z')
  })
})

describe('taskAreaLabel / alertAreaLabel', () => {
  it('traduce las áreas conocidas a nombres legibles con tildes', () => {
    expect(taskAreaLabel('sst')).toBe('Seguridad y salud en el trabajo')
    expect(taskAreaLabel('igualdad_nodiscriminacion')).toBe('Igualdad y no discriminación')
    expect(taskAreaLabel('organigrama')).toBe('Organigrama y comités')
  })

  it('nunca muestra el enum en mayúsculas para áreas desconocidas', () => {
    expect(taskAreaLabel('NUEVA_AREA_X')).toBe('Nueva area x')
    expect(taskAreaLabel('')).toBe('General')
    expect(taskAreaLabel(null)).toBe('General')
  })

  it('agrupa los tipos de alerta por área', () => {
    expect(alertAreaLabel('CONTRATO_POR_VENCER')).toBe('Contratos')
    expect(alertAreaLabel('CAMBIO_REGIMEN_SIN_ADENDA')).toBe('Contratos')
    expect(alertAreaLabel('DOCUMENTO_FALTANTE')).toBe('Legajo del trabajador')
    expect(alertAreaLabel('T_REGISTRO_NO_PRESENTADO')).toBe('Registro en planilla electrónica')
    expect(alertAreaLabel('EMO_VENCIDO')).toBe('Seguridad y salud en el trabajo')
    expect(alertAreaLabel('SAT_PLAZO_PROXIMO')).toBe('Seguridad y salud en el trabajo')
    expect(alertAreaLabel('TARDANZAS_CRONICAS')).toBe('Asistencia')
  })
})

describe('taskHref', () => {
  it('usa la ruta específica según el questionId del diagnóstico', () => {
    expect(taskHref({ sourceId: 'SST-03', area: 'sst' })).toBe('/dashboard/sst')
    expect(taskHref({ sourceId: 'CR-01', area: 'contratos_registro' })).toBe('/dashboard/contratos')
  })

  it('cae al plan de acción si no hay una ruta confiable', () => {
    expect(taskHref({ sourceId: null, area: 'area_desconocida' })).toBe('/dashboard/plan-accion')
  })
})

describe('getComplianceTaskStats', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-05T12:00:00Z'))
    mockPrisma.complianceTask.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: 2 },
      { status: 'IN_PROGRESS', _count: 1 },
      { status: 'COMPLETED', _count: 9 },
    ])
    mockPrisma.complianceTask.aggregate
      .mockResolvedValueOnce({ _sum: { multaEvitable: 30000 } }) // abiertas
      .mockResolvedValueOnce({ _sum: { multaEvitable: 4500 } }) // completadas este mes
    mockPrisma.complianceTask.count.mockResolvedValue(1)
    mockPrisma.complianceTask.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Implementar IPERC firmado',
        area: 'sst',
        sourceId: 'SST-03',
        gravedad: 'MUY_GRAVE',
        multaEvitable: 12000,
        priority: 1,
        status: 'PENDING',
        dueDate: new Date('2026-10-01T12:00:00Z'),
      },
      {
        id: 't2',
        title: 'Tarea sin ruta',
        area: 'area_desconocida',
        sourceId: null,
        gravedad: 'LEVE',
        multaEvitable: null,
        priority: 2,
        status: 'PENDING',
        dueDate: null,
      },
    ])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('filtra la multa evitada por tareas completadas desde el 1.º del mes (Lima)', async () => {
    const result = await getComplianceTaskStats('org-1')

    const completedCall = mockPrisma.complianceTask.aggregate.mock.calls.find(
      ([args]) => args.where.status === 'COMPLETED',
    )
    expect(completedCall?.[0].where).toEqual({
      orgId: 'org-1',
      status: 'COMPLETED',
      completedAt: { gte: new Date('2026-10-01T05:00:00.000Z') },
    })
    expect(result.multaEvitada).toBe(4500)
    expect(result.multaEvitadaDesde).toBe('2026-10-01T05:00:00.000Z')
    expect(result.multaEvitable).toBe(30000)
    expect(result.open).toBe(3)
  })

  it('entrega área legible y ruta específica por tarea', async () => {
    const result = await getComplianceTaskStats('org-1')
    expect(result.top[0]).toMatchObject({
      id: 't1',
      areaLabel: 'Seguridad y salud en el trabajo',
      href: '/dashboard/sst',
      overdue: true,
      multaEvitable: 12000,
    })
    expect(result.top[1]).toMatchObject({
      id: 't2',
      areaLabel: 'Area desconocida',
      href: '/dashboard/plan-accion',
      overdue: false,
    })
  })

  it('degrada a ceros si la tabla falla, sin perder la fecha de corte', async () => {
    mockPrisma.complianceTask.groupBy.mockRejectedValueOnce(new Error('tabla no existe'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await getComplianceTaskStats('org-1')
    expect(result.multaEvitada).toBe(0)
    expect(result.top).toEqual([])
    expect(result.multaEvitadaDesde).toBe('2026-10-01T05:00:00.000Z')
    warn.mockRestore()
  })
})

describe('getLatestDiagnostic / getOpenAlertsMulta', () => {
  afterEach(() => vi.clearAllMocks())

  it('devuelve null si la empresa nunca completó un diagnóstico', async () => {
    mockPrisma.complianceDiagnostic.findFirst.mockResolvedValue(null)
    await expect(getLatestDiagnostic('org-1')).resolves.toBeNull()
    expect(mockPrisma.complianceDiagnostic.findFirst.mock.calls[0][0].where).toEqual({
      orgId: 'org-1',
      completedAt: { not: null },
    })
  })

  it('serializa el último diagnóstico completado', async () => {
    mockPrisma.complianceDiagnostic.findFirst.mockResolvedValue({
      id: 'd1',
      type: 'EXPRESS',
      scoreGlobal: 64,
      completedAt: new Date('2026-09-20T15:00:00Z'),
    })
    await expect(getLatestDiagnostic('org-1')).resolves.toEqual({
      id: 'd1',
      type: 'EXPRESS',
      scoreGlobal: 64,
      completedAt: '2026-09-20T15:00:00.000Z',
    })
  })

  it('suma la multa de las alertas sin resolver', async () => {
    mockPrisma.workerAlert.aggregate.mockResolvedValue({ _sum: { multaEstimada: 7425.5 } })
    await expect(getOpenAlertsMulta('org-1')).resolves.toBe(7425.5)
    expect(mockPrisma.workerAlert.aggregate.mock.calls[0][0].where).toEqual({ orgId: 'org-1', resolvedAt: null })
  })
})

describe('pickFocusAction', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it('devuelve null si no hay tareas ni alertas', () => {
    expect(pickFocusAction([], [], now)).toBeNull()
  })

  it('prioriza una tarea muy grave vencida sobre una alerta alta sin fecha', () => {
    const result = pickFocusAction(
      [task({ id: 't-urgente', gravedad: 'MUY_GRAVE', dueDate: '2026-10-01T12:00:00Z', overdue: true, multaEvitable: 26000 })],
      [alert({ severity: 'HIGH' })],
      now,
    )
    expect(result).toMatchObject({ kind: 'task', id: 't-urgente', href: '/dashboard/sst', overdue: true })
  })

  it('prioriza una alerta crítica sobre una tarea leve y lleva a la ficha del trabajador', () => {
    const result = pickFocusAction(
      [task({ gravedad: 'LEVE' })],
      [alert({ id: 'a-critica', severity: 'CRITICAL', type: 'CONTRATO_VENCIDO', workerId: 'w-9', dueDate: '2026-10-03T12:00:00Z' })],
      now,
    )
    expect(result).toMatchObject({
      kind: 'alert',
      id: 'a-critica',
      href: '/dashboard/trabajadores/w-9',
      areaLabel: 'Contratos',
      workerName: 'Ana Pérez',
      overdue: true,
    })
  })

  it('en empate se queda con la primera tarea (orden de prioridad del diagnóstico)', () => {
    const result = pickFocusAction([task({ id: 'primera' }), task({ id: 'segunda' })], [], now)
    expect(result?.id).toBe('primera')
  })
})

describe('buildRiskSummary', () => {
  it('suma tareas abiertas + alertas abiertas en la multa pendiente', () => {
    const result = buildRiskSummary({
      latestDiagnostic: { id: 'd1', type: 'FULL', scoreGlobal: 70, completedAt: '2026-09-01T15:00:00.000Z' },
      complianceTasks: summary({ multaEvitable: 20000, top: [task({ id: 't1' })] }),
      recentCriticalAlerts: [],
      multaAlertasAbiertas: 4950,
      now: new Date('2026-10-05T12:00:00Z'),
    })
    expect(result.multaPendiente).toBe(24950)
    expect(result.multaAlertasAbiertas).toBe(4950)
    expect(result.focusAction?.id).toBe('t1')
    expect(result.latestDiagnostic?.id).toBe('d1')
  })

  it('no inventa montos negativos ni NaN', () => {
    const result = buildRiskSummary({
      latestDiagnostic: null,
      complianceTasks: summary({ multaEvitable: Number.NaN }),
      recentCriticalAlerts: [],
      multaAlertasAbiertas: -10,
    })
    expect(result.multaPendiente).toBe(0)
    expect(result.focusAction).toBeNull()
  })
})
