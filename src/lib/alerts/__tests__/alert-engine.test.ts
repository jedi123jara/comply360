/**
 * Tests for src/lib/alerts/alert-engine.ts
 *
 * generateWorkerAlerts  — fetches worker, computes alerts, deletes old, creates new
 * generateOrgAlerts     — runs generateWorkerAlerts for all active workers
 * computeAlerts         — pure (not exported; tested indirectly)
 */

import { REQUIRED_DOC_TYPES } from '@/lib/compliance/legajo-config'

// ── Mocks ──────────────────────────────────────────────────────────────────

const {
  mockFindUnique,
  mockFindMany,
  mockDeleteMany,
  mockCreateMany,
  mockTransaction,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockDeleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  mockCreateMany: vi.fn().mockResolvedValue({ count: 0 }),
  // FIX #6.B: el helper ahora envuelve deleteMany+createMany en $transaction
  // para cerrar race condition. El mock simula la transacción ejecutando los
  // ops como Promise.all (mismo behavior funcional que un tx real).
  mockTransaction: vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops as Promise<unknown>[])
    if (typeof ops === 'function') return (ops as (tx: unknown) => unknown)({})
    return ops
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: mockTransaction,
    worker: { findUnique: mockFindUnique, findMany: mockFindMany },
    workerAlert: { deleteMany: mockDeleteMany, createMany: mockCreateMany },
  },
}))

// Import AFTER mocks
import { generateWorkerAlerts, generateOrgAlerts } from '../alert-engine'

// ── Helpers ────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

/** Builds a full WorkerDocument array for every required type. */
function allRequiredDocs() {
  return REQUIRED_DOC_TYPES.map((t) => ({
    documentType: t,
    status: 'UPLOADED',
    expiresAt: null,
  }))
}

interface MockWorkerOpts {
  id?: string
  orgId?: string
  status?: string
  regimenLaboral?: string
  tipoContrato?: string
  tipoAporte?: string
  afpNombre?: string | null
  sueldoBruto?: number
  sctr?: boolean
  essaludVida?: boolean
  legajoScore?: number | null
  fechaIngreso?: Date
  fechaCese?: Date | null
  documents?: { documentType: string; status: string; expiresAt: Date | null }[]
  workerContracts?: { contract: { expiresAt: Date | null; status: string } }[]
  vacations?: { diasPendientes: number; esDoble: boolean; periodoFin: Date }[]
}

interface MockWorkerOptsExt extends MockWorkerOpts {
  flagTRegistroPresentado?: boolean
  deletedAt?: Date | null
}

function buildMockWorker(overrides: MockWorkerOptsExt = {}) {
  return {
    id: overrides.id ?? 'w1',
    orgId: overrides.orgId ?? 'org1',
    dni: '12345678',
    firstName: 'Juan',
    lastName: 'Perez',
    regimenLaboral: overrides.regimenLaboral ?? 'GENERAL',
    tipoContrato: overrides.tipoContrato ?? 'INDEFINIDO',
    tipoAporte: overrides.tipoAporte ?? 'AFP',
    afpNombre: overrides.afpNombre ?? 'Integra',
    fechaIngreso: overrides.fechaIngreso ?? new Date('2025-01-01'),
    fechaCese: overrides.fechaCese ?? null,
    sueldoBruto: overrides.sueldoBruto ?? 3000,
    sctr: overrides.sctr ?? false,
    essaludVida: overrides.essaludVida ?? false,
    status: overrides.status ?? 'ACTIVE',
    legajoScore: overrides.legajoScore !== undefined ? overrides.legajoScore : 90,
    // Ola 1 — soft delete + flag T-REGISTRO
    flagTRegistroPresentado: overrides.flagTRegistroPresentado ?? true,
    deletedAt: overrides.deletedAt ?? null,
    documents: overrides.documents ?? allRequiredDocs(),
    workerContracts: overrides.workerContracts ?? [],
    vacations: overrides.vacations ?? [],
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockDeleteMany.mockResolvedValue({ count: 0 })
  mockCreateMany.mockResolvedValue({ count: 0 })
})

// ═══════════════════════════════════════════════════════════════════════════
// generateWorkerAlerts
// ═══════════════════════════════════════════════════════════════════════════

describe('generateWorkerAlerts', () => {
  it('returns 0 when worker is not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await generateWorkerAlerts('nonexistent')

    expect(result).toBe(0)
    expect(mockDeleteMany).not.toHaveBeenCalled()
    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('returns 0 for TERMINATED worker', async () => {
    mockFindUnique.mockResolvedValue(buildMockWorker({ status: 'TERMINATED' }))

    const result = await generateWorkerAlerts('w1')

    expect(result).toBe(0)
    expect(mockDeleteMany).not.toHaveBeenCalled()
  })

  // ── Contract alerts ───────────────────────────────────────────────────

  it('generates CONTRATO_VENCIDO CRITICAL for expired contract', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        workerContracts: [
          { contract: { expiresAt: daysFromNow(-10), status: 'ACTIVE' } },
        ],
      }),
    )

    const count = await generateWorkerAlerts('w1')

    expect(count).toBeGreaterThan(0)
    const createdAlerts = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const contractAlert = createdAlerts.find((a) => a.type === 'CONTRATO_VENCIDO')
    expect(contractAlert).toBeDefined()
    expect(contractAlert!.severity).toBe('CRITICAL')
  })

  it('generates CONTRATO_POR_VENCER HIGH when contract expires in 5 days', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        workerContracts: [
          { contract: { expiresAt: daysFromNow(5), status: 'ACTIVE' } },
        ],
      }),
    )

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find((a) => a.type === 'CONTRATO_POR_VENCER')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('HIGH')
  })

  it('generates CONTRATO_POR_VENCER MEDIUM when contract expires in 20 days', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        workerContracts: [
          { contract: { expiresAt: daysFromNow(20), status: 'ACTIVE' } },
        ],
      }),
    )

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find((a) => a.type === 'CONTRATO_POR_VENCER')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('MEDIUM')
  })

  it('does NOT generate contract alert when contract expires in 45 days', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        workerContracts: [
          { contract: { expiresAt: daysFromNow(45), status: 'ACTIVE' } },
        ],
      }),
    )

    await generateWorkerAlerts('w1')

    // If createMany was called, check no contract alerts; if not called, count === 0
    if (mockCreateMany.mock.calls.length > 0) {
      const created = mockCreateMany.mock.calls[0][0].data as Array<{
        type: string
      }>
      const contractAlerts = created.filter(
        (a) => a.type === 'CONTRATO_VENCIDO' || a.type === 'CONTRATO_POR_VENCER',
      )
      expect(contractAlerts).toHaveLength(0)
    }
  })

  // ── Vacation alerts ───────────────────────────────────────────────────

  it('generates VACACIONES_ACUMULADAS when 2+ vacation periods pending', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        vacations: [
          { diasPendientes: 15, esDoble: false, periodoFin: daysFromNow(-30) },
          { diasPendientes: 30, esDoble: false, periodoFin: daysFromNow(-365) },
        ],
      }),
    )

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find((a) => a.type === 'VACACIONES_ACUMULADAS')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('HIGH')
  })

  it('generates VACACIONES_DOBLE_PERIODO CRITICAL when esDoble is true', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        vacations: [
          { diasPendientes: 30, esDoble: true, periodoFin: daysFromNow(-400) },
          { diasPendientes: 30, esDoble: false, periodoFin: daysFromNow(-30) },
        ],
      }),
    )

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find((a) => a.type === 'VACACIONES_DOBLE_PERIODO')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('CRITICAL')
  })

  // ── Missing documents ─────────────────────────────────────────────────

  it('generates DOCUMENTO_FALTANTE HIGH when 5+ required docs are missing', async () => {
    // Provide only the first 13 of 18 required docs → 5 missing
    const docs = REQUIRED_DOC_TYPES.slice(0, 13).map((t) => ({
      documentType: t,
      status: 'UPLOADED',
      expiresAt: null,
    }))

    mockFindUnique.mockResolvedValue(buildMockWorker({ documents: docs }))

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find(
      (a) => a.type === 'DOCUMENTO_FALTANTE' && a.severity === 'HIGH',
    )
    expect(alert).toBeDefined()
  })

  it('generates DOCUMENTO_FALTANTE MEDIUM when 2 required docs are missing', async () => {
    // Provide 16 of 18 → 2 missing
    const docs = REQUIRED_DOC_TYPES.slice(0, 16).map((t) => ({
      documentType: t,
      status: 'UPLOADED',
      expiresAt: null,
    }))

    mockFindUnique.mockResolvedValue(buildMockWorker({ documents: docs }))

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find(
      (a) => a.type === 'DOCUMENTO_FALTANTE' && a.severity === 'MEDIUM',
    )
    expect(alert).toBeDefined()
  })

  // ── Expired medical exam ──────────────────────────────────────────────

  it('generates EXAMEN_MEDICO_VENCIDO CRITICAL for expired examen_medico_periodico', async () => {
    const docs = allRequiredDocs().map((d) =>
      d.documentType === 'examen_medico_periodico'
        ? { ...d, expiresAt: daysFromNow(-10) }
        : d,
    )

    mockFindUnique.mockResolvedValue(buildMockWorker({ documents: docs }))

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
      severity: string
    }>
    const alert = created.find((a) => a.type === 'EXAMEN_MEDICO_VENCIDO')
    expect(alert).toBeDefined()
    expect(alert!.severity).toBe('CRITICAL')
  })

  // ── Incomplete legajo ─────────────────────────────────────────────────

  it('generates REGISTRO_INCOMPLETO when legajoScore < 70', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({ legajoScore: 50 }),
    )

    await generateWorkerAlerts('w1')

    const created = mockCreateMany.mock.calls[0][0].data as Array<{
      type: string
    }>
    const alert = created.find((a) => a.type === 'REGISTRO_INCOMPLETO')
    expect(alert).toBeDefined()
  })

  // ── All-good worker ───────────────────────────────────────────────────

  it('generates fewer alerts for well-configured worker', async () => {
    // All docs present, high score, no expired contracts, no pending vacations,
    // recent hire (< 2 years), has essalud, has induccion, has essaludVida
    const docs = allRequiredDocs()
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        legajoScore: 95,
        essaludVida: true,
        fechaIngreso: new Date(), // just started, avoids EMO/seguro vida alerts
        documents: docs,
        workerContracts: [],
        vacations: [],
      }),
    )

    const count = await generateWorkerAlerts('w1')

    // Should generate very few alerts — possibly zero for doc-related,
    // but calendar-based ones may fire depending on current date.
    // The key assertion: no CRITICAL doc/contract alerts
    if (mockCreateMany.mock.calls.length > 0) {
      const created = mockCreateMany.mock.calls[0][0].data as Array<{
        type: string
        severity: string
      }>
      const criticalDocOrContract = created.filter(
        (a) =>
          a.severity === 'CRITICAL' &&
          ['CONTRATO_VENCIDO', 'VACACIONES_DOBLE_PERIODO', 'EXAMEN_MEDICO_VENCIDO'].includes(a.type),
      )
      expect(criticalDocOrContract).toHaveLength(0)
    } else {
      expect(count).toBe(0)
    }
  })

  // ── Deletes old unresolved alerts ─────────────────────────────────────

  it('deletes old unresolved alerts before creating new ones', async () => {
    mockFindUnique.mockResolvedValue(buildMockWorker({ legajoScore: 40 }))

    await generateWorkerAlerts('w1')

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { workerId: 'w1', resolvedAt: null },
    })
    // deleteMany must be called before createMany
    const deleteOrder = mockDeleteMany.mock.invocationCallOrder[0]
    if (mockCreateMany.mock.calls.length > 0) {
      const createOrder = mockCreateMany.mock.invocationCallOrder[0]
      expect(deleteOrder).toBeLessThan(createOrder)
    }
  })

  // ── CTS/Grat regime gating ────────────────────────────────────────────

  it('does NOT generate CTS alert for MYPE_MICRO regime', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({ regimenLaboral: 'MYPE_MICRO' }),
    )

    await generateWorkerAlerts('w1')

    if (mockCreateMany.mock.calls.length > 0) {
      const created = mockCreateMany.mock.calls[0][0].data as Array<{
        type: string
      }>
      const ctsAlerts = created.filter((a) => a.type === 'CTS_PENDIENTE')
      expect(ctsAlerts).toHaveLength(0)
    }
  })

  it('does NOT generate GRATIFICACION alert for MYPE_MICRO regime', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({ regimenLaboral: 'MYPE_MICRO' }),
    )

    await generateWorkerAlerts('w1')

    if (mockCreateMany.mock.calls.length > 0) {
      const created = mockCreateMany.mock.calls[0][0].data as Array<{
        type: string
      }>
      const gratAlerts = created.filter((a) => a.type === 'GRATIFICACION_PENDIENTE')
      expect(gratAlerts).toHaveLength(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// generateOrgAlerts
// ═══════════════════════════════════════════════════════════════════════════

describe('generateOrgAlerts', () => {
  it('runs generateWorkerAlerts for each active worker', async () => {
    mockFindMany.mockResolvedValue([{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }])

    // Each findUnique call returns a valid worker
    mockFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      buildMockWorker({ id: where.id }),
    )

    const result = await generateOrgAlerts('org1')

    expect(result.workers).toBe(3)
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(mockFindUnique).toHaveBeenCalledTimes(3)
  })

  it('returns total=0 and workers=0 when no active workers', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await generateOrgAlerts('org1')

    expect(result).toEqual({ total: 0, workers: 0 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Ola 1 — Compliance hardening (T-REGISTRO + SCTR + Licencia médica)
// ═══════════════════════════════════════════════════════════════════════════

describe('Ola 1 — T_REGISTRO_NO_PRESENTADO', () => {
  it('genera alerta CRITICAL si han pasado >7 días sin marca de T-Registro', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        fechaIngreso: daysFromNow(-14),
        flagTRegistroPresentado: false,
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string; severity: string }>
    const tReg = alerts.find(a => a.type === 'T_REGISTRO_NO_PRESENTADO')
    expect(tReg).toBeDefined()
    expect(tReg!.severity).toBe('CRITICAL')
  })

  it('genera alerta HIGH si entre 2 y 7 días sin marca', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        fechaIngreso: daysFromNow(-3),
        flagTRegistroPresentado: false,
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string; severity: string }>
    const tReg = alerts.find(a => a.type === 'T_REGISTRO_NO_PRESENTADO')
    expect(tReg).toBeDefined()
    expect(tReg!.severity).toBe('HIGH')
  })

  it('NO alerta si flagTRegistroPresentado=true', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        fechaIngreso: daysFromNow(-30),
        flagTRegistroPresentado: true,
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0]?.data as Array<{ type: string }> | undefined
    expect(alerts?.some(a => a.type === 'T_REGISTRO_NO_PRESENTADO')).toBeFalsy()
  })

  it('NO alerta si solo pasó 1 día desde ingreso', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        fechaIngreso: daysFromNow(-1),
        flagTRegistroPresentado: false,
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0]?.data as Array<{ type: string }> | undefined
    expect(alerts?.some(a => a.type === 'T_REGISTRO_NO_PRESENTADO')).toBeFalsy()
  })
})

describe('Ola 1 — SCTR_VENCIDO', () => {
  it('genera alerta CRITICAL en CONSTRUCCION_CIVIL sin SCTR vigente', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        regimenLaboral: 'CONSTRUCCION_CIVIL',
        sctr: true,
        documents: allRequiredDocs(), // sin doc 'sctr'
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string; severity: string }>
    const sctr = alerts.find(a => a.type === 'SCTR_VENCIDO')
    expect(sctr).toBeDefined()
    expect(sctr!.severity).toBe('CRITICAL')
  })

  it.each(['MINERO', 'PESQUERO'])('alerta también en %s', async (regimen) => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        regimenLaboral: regimen,
        sctr: false,
        documents: allRequiredDocs(),
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string }>
    expect(alerts.some(a => a.type === 'SCTR_VENCIDO')).toBe(true)
  })

  it('NO alerta si SCTR doc tiene expiresAt en el futuro', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        regimenLaboral: 'CONSTRUCCION_CIVIL',
        sctr: true,
        documents: [
          ...allRequiredDocs(),
          { documentType: 'sctr', status: 'UPLOADED', expiresAt: daysFromNow(60) },
        ],
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0]?.data as Array<{ type: string }> | undefined
    expect(alerts?.some(a => a.type === 'SCTR_VENCIDO')).toBeFalsy()
  })

  it('NO alerta en GENERAL sin sctr=true', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({ regimenLaboral: 'GENERAL', sctr: false }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0]?.data as Array<{ type: string }> | undefined
    expect(alerts?.some(a => a.type === 'SCTR_VENCIDO')).toBeFalsy()
  })
})

describe('Ola 1 — LICENCIA_MEDICA_VENCIDA', () => {
  it('alerta cuando licencia_medica expiró sin renovación', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        documents: [
          ...allRequiredDocs(),
          {
            documentType: 'licencia_medica',
            status: 'UPLOADED',
            expiresAt: daysFromNow(-3),
          },
        ],
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string; severity: string }>
    const lic = alerts.find(a => a.type === 'LICENCIA_MEDICA_VENCIDA')
    expect(lic).toBeDefined()
    expect(lic!.severity).toBe('MEDIUM')
  })

  it('severity HIGH si vencida hace 7+ días', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({
        documents: [
          ...allRequiredDocs(),
          {
            documentType: 'descanso_medico',
            status: 'UPLOADED',
            expiresAt: daysFromNow(-15),
          },
        ],
      }),
    )

    await generateWorkerAlerts('w1')
    const alerts = mockCreateMany.mock.calls[0][0].data as Array<{ type: string; severity: string }>
    const lic = alerts.find(a => a.type === 'LICENCIA_MEDICA_VENCIDA')
    expect(lic?.severity).toBe('HIGH')
  })
})

describe('Ola 1 — soft delete', () => {
  it('returns 0 for soft-deleted worker (deletedAt != null)', async () => {
    mockFindUnique.mockResolvedValue(
      buildMockWorker({ deletedAt: new Date() }),
    )

    const result = await generateWorkerAlerts('w1')
    expect(result).toBe(0)
    expect(mockDeleteMany).not.toHaveBeenCalled()
  })
})
