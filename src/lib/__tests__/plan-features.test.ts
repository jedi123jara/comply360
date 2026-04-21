import { describe, it, expect } from 'vitest'
import {
  PLAN_FEATURES,
  FEATURE_MIN_PLAN,
  planHasFeature,
  isRouteLocked,
  ROUTE_FEATURE_MAP,
} from '@/lib/plan-features'

describe('plan-features / coverage por tier', () => {
  it('FREE solo tiene calculadoras', () => {
    expect(PLAN_FEATURES.FREE).toEqual(['calculadoras'])
  })

  it('STARTER cubre workers + alertas basicas + calendario + contratos', () => {
    expect(PLAN_FEATURES.STARTER).toContain('calculadoras')
    expect(PLAN_FEATURES.STARTER).toContain('workers')
    expect(PLAN_FEATURES.STARTER).toContain('alertas_basicas')
    expect(PLAN_FEATURES.STARTER).toContain('calendario')
    expect(PLAN_FEATURES.STARTER).toContain('contratos')
  })

  it('EMPRESA extiende STARTER con diagnostico + simulacro basico + IA contratos', () => {
    expect(PLAN_FEATURES.EMPRESA).toContain('diagnostico')
    expect(PLAN_FEATURES.EMPRESA).toContain('simulacro_basico')
    expect(PLAN_FEATURES.EMPRESA).toContain('ia_contratos')
    expect(PLAN_FEATURES.EMPRESA).toContain('gamificacion')
    // No incluye features exclusivas PRO
    expect(PLAN_FEATURES.EMPRESA).not.toContain('asistente_ia')
    expect(PLAN_FEATURES.EMPRESA).not.toContain('api_access')
  })

  it('PRO incluye todas las features', () => {
    const allFeatures = Object.keys(FEATURE_MIN_PLAN)
    for (const f of allFeatures) {
      expect(PLAN_FEATURES.PRO).toContain(f)
    }
  })

  it('jerarquia estricta: cada feature minima corresponde al tier que la incluye', () => {
    for (const [feature, minPlan] of Object.entries(FEATURE_MIN_PLAN)) {
      expect(PLAN_FEATURES[minPlan]).toContain(feature)
    }
  })
})

describe('plan-features / planHasFeature', () => {
  it('STARTER no tiene diagnostico', () => {
    expect(planHasFeature('STARTER', 'diagnostico')).toBe(false)
  })

  it('EMPRESA tiene diagnostico', () => {
    expect(planHasFeature('EMPRESA', 'diagnostico')).toBe(true)
  })

  it('PRO tiene asistente_ia', () => {
    expect(planHasFeature('PRO', 'asistente_ia')).toBe(true)
  })

  it('EMPRESA no tiene asistente_ia (exclusivo PRO)', () => {
    expect(planHasFeature('EMPRESA', 'asistente_ia')).toBe(false)
  })

  it('plan desconocido se trata como FREE', () => {
    expect(planHasFeature('UNKNOWN_PLAN', 'calculadoras')).toBe(true)
    expect(planHasFeature('UNKNOWN_PLAN', 'diagnostico')).toBe(false)
  })
})

describe('plan-features / isRouteLocked', () => {
  it('rutas sin gating no se bloquean', () => {
    expect(isRouteLocked('FREE', '/dashboard')).toBe(false)
    expect(isRouteLocked('FREE', '/dashboard/trabajadores')).toBe(false)
  })

  it('rutas gated se bloquean cuando el plan no tiene la feature', () => {
    expect(isRouteLocked('STARTER', '/dashboard/diagnostico')).toBe(true)
    expect(isRouteLocked('STARTER', '/dashboard/ia-laboral')).toBe(true)
    expect(isRouteLocked('STARTER', '/dashboard/sst')).toBe(true)
  })

  it('rutas gated se desbloquean con el plan adecuado', () => {
    expect(isRouteLocked('EMPRESA', '/dashboard/diagnostico')).toBe(false)
    expect(isRouteLocked('PRO', '/dashboard/ia-laboral')).toBe(false)
    expect(isRouteLocked('PRO', '/dashboard/sst')).toBe(false)
  })

  it('ROUTE_FEATURE_MAP cubre las rutas criticas de los 7 hubs', () => {
    const keys = Object.keys(ROUTE_FEATURE_MAP)
    expect(keys).toContain('/dashboard/diagnostico')
    expect(keys).toContain('/dashboard/simulacro')
    expect(keys).toContain('/dashboard/ia-laboral')
    expect(keys).toContain('/dashboard/sst')
  })
})
