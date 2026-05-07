import {
  planHasFeature,
  getPlanFeatures,
  getMaxWorkers,
  getMaxUsers,
  checkWorkerLimit,
  FEATURE_MIN_PLAN,
  withPlanGate,
} from '@/lib/plan-gate'
import type { PlanFeature } from '@/lib/plan-gate'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/prisma', () => ({
  prisma: {
    worker: { count: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}))

import { prisma } from '@/lib/prisma'

const mockedWorkerCount = prisma.worker.count as ReturnType<typeof vi.fn>
const mockedOrgFindUnique = prisma.organization.findUnique as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// planHasFeature
// ---------------------------------------------------------------------------

describe('planHasFeature', () => {
  it('FREE has calculadoras', () => {
    expect(planHasFeature('FREE', 'calculadoras')).toBe(true)
  })

  it('FREE does NOT have workers', () => {
    expect(planHasFeature('FREE', 'workers')).toBe(false)
  })

  it('STARTER has workers, alertas_basicas, calendario, contratos', () => {
    expect(planHasFeature('STARTER', 'workers')).toBe(true)
    expect(planHasFeature('STARTER', 'alertas_basicas')).toBe(true)
    expect(planHasFeature('STARTER', 'calendario')).toBe(true)
    expect(planHasFeature('STARTER', 'contratos')).toBe(true)
  })

  it('STARTER does NOT have diagnostico', () => {
    expect(planHasFeature('STARTER', 'diagnostico')).toBe(false)
  })

  it('EMPRESA has diagnostico, simulacro_basico, reportes_pdf, ia_contratos', () => {
    expect(planHasFeature('EMPRESA', 'diagnostico')).toBe(true)
    expect(planHasFeature('EMPRESA', 'simulacro_basico')).toBe(true)
    expect(planHasFeature('EMPRESA', 'reportes_pdf')).toBe(true)
    expect(planHasFeature('EMPRESA', 'ia_contratos')).toBe(true)
  })

  it('EMPRESA does NOT have asistente_ia', () => {
    expect(planHasFeature('EMPRESA', 'asistente_ia')).toBe(false)
  })

  it('PRO has ALL features', () => {
    const allFeatures: PlanFeature[] = [
      'calculadoras', 'workers', 'alertas_basicas', 'calendario', 'contratos',
      'diagnostico', 'simulacro_basico', 'reportes_pdf', 'ia_contratos',
      'asistente_ia', 'review_ia', 'simulacro_completo', 'denuncias',
      'sst_completo', 'api_access',
    ]
    for (const feature of allFeatures) {
      expect(planHasFeature('PRO', feature)).toBe(true)
    }
  })

  it('Unknown plan falls back to FREE features', () => {
    expect(planHasFeature('NONEXISTENT', 'calculadoras')).toBe(true)
    expect(planHasFeature('NONEXISTENT', 'workers')).toBe(false)
    expect(planHasFeature('NONEXISTENT', 'diagnostico')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getPlanFeatures
// ---------------------------------------------------------------------------

describe('getPlanFeatures', () => {
  it('Returns configured feature arrays per plan', () => {
    expect(getPlanFeatures('FREE')).toEqual(['calculadoras'])
    expect(getPlanFeatures('STARTER')).toEqual(expect.arrayContaining([
      'calculadoras',
      'workers',
      'alertas_basicas',
      'calendario',
      'contratos',
    ]))
    expect(getPlanFeatures('EMPRESA')).toEqual(expect.arrayContaining([
      'diagnostico',
      'simulacro_basico',
      'reportes_pdf',
      'ia_contratos',
      'organigrama_completo',
    ]))
    expect(getPlanFeatures('PRO')).toEqual(expect.arrayContaining([
      'asistente_ia',
      'review_ia',
      'simulacro_completo',
      'denuncias',
      'sst_completo',
      'api_access',
    ]))
  })

  it('Unknown plan returns FREE features', () => {
    const unknown = getPlanFeatures('DOES_NOT_EXIST')
    const free = getPlanFeatures('FREE')
    expect(unknown).toEqual(free)
  })
})

// ---------------------------------------------------------------------------
// getMaxWorkers
// ---------------------------------------------------------------------------

describe('getMaxWorkers', () => {
  it('FREE = 5', () => {
    expect(getMaxWorkers('FREE')).toBe(5)
  })

  it('STARTER = 20', () => {
    expect(getMaxWorkers('STARTER')).toBe(20)
  })

  it('EMPRESA = 250', () => {
    expect(getMaxWorkers('EMPRESA')).toBe(250)
  })

  it('PRO = 75', () => {
    expect(getMaxWorkers('PRO')).toBe(75)
  })

  it('ENTERPRISE = 999999', () => {
    expect(getMaxWorkers('ENTERPRISE')).toBe(999999)
  })

  it('Unknown plan defaults to 5', () => {
    expect(getMaxWorkers('BOGUS')).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// getMaxUsers
// ---------------------------------------------------------------------------

describe('getMaxUsers', () => {
  it('FREE = 1', () => {
    expect(getMaxUsers('FREE')).toBe(1)
  })

  it('STARTER = 2', () => {
    expect(getMaxUsers('STARTER')).toBe(2)
  })

  it('EMPRESA = 15', () => {
    expect(getMaxUsers('EMPRESA')).toBe(15)
  })

  it('PRO = 5', () => {
    expect(getMaxUsers('PRO')).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// checkWorkerLimit
// ---------------------------------------------------------------------------

describe('checkWorkerLimit', () => {
  beforeEach(() => {
    mockedWorkerCount.mockReset()
  })

  it('19 workers on STARTER -> allowed: true, current: 19, max: 20', async () => {
    mockedWorkerCount.mockResolvedValue(19)

    const result = await checkWorkerLimit('org-1', 'STARTER')

    expect(result).toEqual({ allowed: true, current: 19, max: 20 })
    expect(mockedWorkerCount).toHaveBeenCalledWith({
      where: { orgId: 'org-1', status: { not: 'TERMINATED' } },
    })
  })

  it('20 workers on STARTER -> allowed: false, current: 20, max: 20', async () => {
    mockedWorkerCount.mockResolvedValue(20)

    const result = await checkWorkerLimit('org-2', 'STARTER')

    expect(result).toEqual({ allowed: false, current: 20, max: 20 })
  })

  it('0 workers on FREE -> allowed: true, current: 0, max: 5', async () => {
    mockedWorkerCount.mockResolvedValue(0)

    const result = await checkWorkerLimit('org-3', 'FREE')

    expect(result).toEqual({ allowed: true, current: 0, max: 5 })
  })
})

// ---------------------------------------------------------------------------
// FEATURE_MIN_PLAN
// ---------------------------------------------------------------------------

describe('FEATURE_MIN_PLAN', () => {
  it('calculadoras -> FREE', () => {
    expect(FEATURE_MIN_PLAN.calculadoras).toBe('FREE')
  })

  it('workers -> STARTER', () => {
    expect(FEATURE_MIN_PLAN.workers).toBe('STARTER')
  })

  it('diagnostico -> EMPRESA', () => {
    expect(FEATURE_MIN_PLAN.diagnostico).toBe('EMPRESA')
  })

  it('asistente_ia -> PRO', () => {
    expect(FEATURE_MIN_PLAN.asistente_ia).toBe('PRO')
  })

  it('Every PlanFeature has an entry in FEATURE_MIN_PLAN', () => {
    const allFeatures: PlanFeature[] = [
      'calculadoras', 'workers', 'alertas_basicas', 'calendario', 'contratos',
      'diagnostico', 'simulacro_basico', 'reportes_pdf', 'ia_contratos',
      'asistente_ia', 'review_ia', 'simulacro_completo', 'denuncias',
      'sst_completo', 'api_access',
    ]
    for (const feature of allFeatures) {
      expect(FEATURE_MIN_PLAN).toHaveProperty(feature)
      expect(typeof FEATURE_MIN_PLAN[feature]).toBe('string')
    }
  })
})

// ---------------------------------------------------------------------------
// withPlanGate
// ---------------------------------------------------------------------------

describe('withPlanGate', () => {
  const mockCtx = { orgId: 'org-gate', userId: 'user-1', role: 'OWNER' }

  function makeMockRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', { method: 'GET' })
  }

  beforeEach(() => {
    mockedOrgFindUnique.mockReset()
  })

  it('Returns 404 when org not found', async () => {
    mockedOrgFindUnique.mockResolvedValue(null)

    const handler = vi.fn()
    const gated = withPlanGate('asistente_ia', handler)
    const req = makeMockRequest()

    const res = await (gated as (req: unknown, ctx: unknown) => Promise<Response>)(req, mockCtx)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.code).toBe('ORG_NOT_FOUND')
    expect(handler).not.toHaveBeenCalled()
  })

  it('Returns 403 with PLAN_UPGRADE_REQUIRED when feature not allowed', async () => {
    mockedOrgFindUnique.mockResolvedValue({ plan: 'STARTER', planExpiresAt: null })

    const handler = vi.fn()
    const gated = withPlanGate('asistente_ia', handler)
    const req = makeMockRequest()

    const res = await (gated as (req: unknown, ctx: unknown) => Promise<Response>)(req, mockCtx)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.code).toBe('PLAN_UPGRADE_REQUIRED')
    expect(body.requiredPlan).toBe('PRO')
    expect(body.currentPlan).toBe('STARTER')
    expect(body.upgradeUrl).toBe('/dashboard/planes')
    expect(handler).not.toHaveBeenCalled()
  })

  it('Calls handler when feature is allowed', async () => {
    mockedOrgFindUnique.mockResolvedValue({ plan: 'PRO', planExpiresAt: null })

    const successResponse = NextResponse.json({ ok: true })
    const handler = vi.fn().mockResolvedValue(successResponse)
    const gated = withPlanGate('asistente_ia', handler)
    const req = makeMockRequest()

    const res = await (gated as (req: unknown, ctx: unknown) => Promise<Response>)(req, mockCtx)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(handler).toHaveBeenCalledWith(req, mockCtx)
  })

  it('Expired trial (planExpiresAt in past) is treated as STARTER', async () => {
    const pastDate = new Date('2025-01-01T00:00:00Z')
    mockedOrgFindUnique.mockResolvedValue({ plan: 'PRO', planExpiresAt: pastDate })

    const handler = vi.fn()
    const gated = withPlanGate('asistente_ia', handler)
    const req = makeMockRequest()

    const res = await (gated as (req: unknown, ctx: unknown) => Promise<Response>)(req, mockCtx)
    const body = await res.json()

    // FIX #0.4: asistente_ia requires PRO; expired trial degrada a FREE
    // (antes degradaba a STARTER, regalando un escape valve gratuito hasta
    // que corriera el cron). Ahora fail closed → FREE.
    expect(res.status).toBe(403)
    expect(body.code).toBe('PLAN_UPGRADE_REQUIRED')
    expect(body.currentPlan).toBe('FREE')
    expect(handler).not.toHaveBeenCalled()
  })
})
