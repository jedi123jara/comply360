import { describe, it, expect } from 'vitest'
import { PLANS } from '@/lib/constants'
import {
  ALL_PLAN_FEATURES,
  PLAN_FEATURES,
  PLAN_TIER_ORDER,
  FEATURE_MIN_PLAN,
  planHasFeature,
  isRouteLocked,
  getRouteFeature,
  getRouteMinPlan,
  resolveRouteFeature,
  getPlanLockCopy,
  planDisplayName,
  ROUTE_FEATURE_MAP,
  UNGATED_ROUTES,
  type PlanFeature,
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
    // EMPRESA (S/1899) es superset de PRO (S/699): incluye sus features premium.
    expect(PLAN_FEATURES.EMPRESA).toContain('asistente_ia')
    expect(PLAN_FEATURES.EMPRESA).toContain('api_access')
  })

  it('PRO incluye las features cuyo plan minimo es PRO o menor', () => {
    const proAndBelow = Object.entries(FEATURE_MIN_PLAN)
      .filter(([, minPlan]) => ['FREE', 'STARTER', 'PRO'].includes(minPlan))
      .map(([feature]) => feature)

    for (const feature of proAndBelow) {
      expect(PLAN_FEATURES.PRO).toContain(feature)
    }
  })

  it('EMPRESA es superset estricto de PRO (cuesta más → incluye todo lo de PRO)', () => {
    for (const feature of PLAN_FEATURES.PRO) {
      expect(PLAN_FEATURES.EMPRESA).toContain(feature)
    }
  })

  it('jerarquia estricta: cada feature minima corresponde al tier que la incluye', () => {
    for (const [feature, minPlan] of Object.entries(FEATURE_MIN_PLAN)) {
      expect(PLAN_FEATURES[minPlan]).toContain(feature)
    }
  })
})

describe('plan-features / FEATURE_MIN_PLAN derivado de la matriz real', () => {
  it('PLAN_TIER_ORDER va del más barato al más caro según PLANS (cotización a medida al final)', () => {
    const effectivePrice = (plan: (typeof PLAN_TIER_ORDER)[number]) =>
      PLANS[plan].isCustomQuote ? Number.POSITIVE_INFINITY : PLANS[plan].price
    for (let i = 1; i < PLAN_TIER_ORDER.length; i++) {
      expect(effectivePrice(PLAN_TIER_ORDER[i])).toBeGreaterThan(
        effectivePrice(PLAN_TIER_ORDER[i - 1]),
      )
    }
  })

  it('PLAN_TIER_ORDER no recomienda el plan legacy BUSINESS', () => {
    expect(PLAN_TIER_ORDER as readonly string[]).not.toContain('BUSINESS')
  })

  it('cada feature tiene plan mínimo y ese plan la incluye', () => {
    for (const feature of ALL_PLAN_FEATURES) {
      const minPlan = FEATURE_MIN_PLAN[feature]
      expect(minPlan, `${feature} sin plan mínimo`).toBeDefined()
      expect(PLAN_FEATURES[minPlan], `${minPlan} no incluye ${feature}`).toContain(feature)
    }
  })

  it('ningún plan más barato que el mínimo incluye la feature', () => {
    for (const feature of ALL_PLAN_FEATURES) {
      const minIndex = PLAN_TIER_ORDER.indexOf(FEATURE_MIN_PLAN[feature])
      expect(minIndex).toBeGreaterThanOrEqual(0)
      for (const cheaper of PLAN_TIER_ORDER.slice(0, minIndex)) {
        expect(
          PLAN_FEATURES[cheaper],
          `${feature}: ${cheaper} es más barato que ${FEATURE_MIN_PLAN[feature]} y ya la incluye`,
        ).not.toContain(feature)
      }
    }
  })

  it('toda feature usada en la matriz está declarada en ALL_PLAN_FEATURES', () => {
    const declared = new Set<string>(ALL_PLAN_FEATURES)
    for (const features of Object.values(PLAN_FEATURES)) {
      for (const feature of features) expect(declared.has(feature)).toBe(true)
    }
  })

  it('regresión: diagnóstico, simulacro y reportes piden PRO (S/699), no EMPRESA (S/1,899)', () => {
    expect(FEATURE_MIN_PLAN.diagnostico).toBe('PRO')
    expect(FEATURE_MIN_PLAN.simulacro_basico).toBe('PRO')
    expect(FEATURE_MIN_PLAN.reportes_pdf).toBe('PRO')
    expect(FEATURE_MIN_PLAN.ia_contratos).toBe('PRO')
  })

  it('organigrama avanzado sigue siendo EMPRESA (PRO no lo incluye)', () => {
    expect(FEATURE_MIN_PLAN.organigrama_completo).toBe('EMPRESA')
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

  it('EMPRESA sí tiene asistente_ia (es superset de PRO)', () => {
    expect(planHasFeature('EMPRESA', 'asistente_ia')).toBe(true)
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
    expect(isRouteLocked('STARTER', '/dashboard/centro-sunafil')).toBe(true)
    expect(isRouteLocked('STARTER', '/dashboard/diagnostico')).toBe(true)
    expect(isRouteLocked('STARTER', '/dashboard/ia-laboral')).toBe(true)
    expect(isRouteLocked('STARTER', '/dashboard/sst')).toBe(true)
  })

  it('rutas gated se desbloquean con el plan adecuado', () => {
    expect(isRouteLocked('EMPRESA', '/dashboard/centro-sunafil')).toBe(false)
    expect(isRouteLocked('EMPRESA', '/dashboard/diagnostico')).toBe(false)
    expect(isRouteLocked('PRO', '/dashboard/ia-laboral')).toBe(false)
    expect(isRouteLocked('PRO', '/dashboard/sst')).toBe(false)
  })

  it('ROUTE_FEATURE_MAP cubre las rutas criticas de los 7 hubs', () => {
    const keys = Object.keys(ROUTE_FEATURE_MAP)
    expect(keys).toContain('/dashboard/centro-sunafil')
    expect(keys).toContain('/dashboard/diagnostico')
    expect(keys).toContain('/dashboard/simulacro')
    expect(keys).toContain('/dashboard/ia-laboral')
    expect(keys).toContain('/dashboard/sst')
  })
})

describe('plan-features / bloqueo por prefijo de ruta', () => {
  it('las subrutas de una sección bloqueada también se bloquean (SST)', () => {
    for (const href of [
      '/dashboard/sst/emo',
      '/dashboard/sst/sedes',
      '/dashboard/sst/comite/elecciones',
      '/dashboard/sst/iperc-bases/abc123/import',
      '/dashboard/diagnostico/abc123/resultado',
    ]) {
      expect(isRouteLocked('STARTER', href), href).toBe(true)
      expect(isRouteLocked('PRO', href), href).toBe(false)
    }
  })

  it('no confunde prefijos parciales: /dashboard/sst-x no es /dashboard/sst', () => {
    expect(getRouteFeature('/dashboard/sst-legacy')).toBeNull()
    expect(isRouteLocked('FREE', '/dashboard/sstx')).toBe(false)
  })

  it('ignora query string, hash y barra final', () => {
    expect(getRouteFeature('/dashboard/sst?tab=comite')).toBe('sst_completo')
    expect(getRouteFeature('/dashboard/sst/emo#vencidos')).toBe('sst_completo')
    expect(getRouteFeature('/dashboard/sst/')).toBe('sst_completo')
  })

  it('la coincidencia más específica gana (EPP usa diagnostico, no sst_completo)', () => {
    expect(getRouteFeature('/dashboard/sst')).toBe('sst_completo')
    expect(getRouteFeature('/dashboard/sst/epp')).toBe('diagnostico')
    expect(getRouteFeature('/dashboard/sst/epp/nuevo')).toBe('diagnostico')
  })

  it('getRouteMinPlan devuelve el plan más barato que desbloquea la ruta', () => {
    expect(getRouteMinPlan('/dashboard/sst/emo')).toBe('PRO')
    expect(getRouteMinPlan('/dashboard/organigrama/people')).toBe('PRO')
    expect(getRouteMinPlan('/dashboard/trabajadores')).toBeNull()
  })

  it('resolveRouteFeature: excepciones libres dentro de una sección bloqueada', () => {
    const map: Record<string, PlanFeature> = {
      '/dashboard/modulo': 'sst_completo',
      '/dashboard/modulo/avanzado': 'organigrama_completo',
    }
    const ungated = ['/dashboard/modulo/ayuda']

    expect(resolveRouteFeature('/dashboard/modulo/listado', map, ungated)).toBe('sst_completo')
    expect(resolveRouteFeature('/dashboard/modulo/avanzado/x', map, ungated)).toBe(
      'organigrama_completo',
    )
    expect(resolveRouteFeature('/dashboard/modulo/ayuda', map, ungated)).toBeNull()
    expect(resolveRouteFeature('/dashboard/modulo/ayuda/faq', map, ungated)).toBeNull()
    expect(resolveRouteFeature('/dashboard/otro', map, ungated)).toBeNull()
  })

  it('resolveRouteFeature: una excepción igual de específica gana a la regla', () => {
    const map: Record<string, PlanFeature> = { '/dashboard/modulo': 'sst_completo' }
    expect(resolveRouteFeature('/dashboard/modulo', map, ['/dashboard/modulo'])).toBeNull()
  })

  it('UNGATED_ROUTES solo contiene rutas que caen dentro de una sección con candado', () => {
    for (const route of UNGATED_ROUTES) {
      const parent = Object.keys(ROUTE_FEATURE_MAP).some(
        (prefix) => route !== prefix && route.startsWith(`${prefix}/`),
      )
      expect(parent, `${route} no está dentro de ninguna sección con candado`).toBe(true)
    }
  })
})

describe('plan-features / textos del candado', () => {
  it('usa el nombre real del plan, nunca abreviaturas', () => {
    expect(getPlanLockCopy('PRO').label).toBe('Disponible desde Pro')
    expect(getPlanLockCopy('EMPRESA').label).toBe('Disponible desde Empresa')
    expect(getPlanLockCopy('EMPRESA').shortLabel).toBe('Desde Empresa')
    expect(getPlanLockCopy('EMPRESA').label).not.toMatch(/\bEMP\b/)
  })

  it('cada plan mínimo posible tiene un nombre legible', () => {
    for (const plan of new Set(Object.values(FEATURE_MIN_PLAN))) {
      const name = planDisplayName(plan)
      expect(name).toBe(PLANS[plan].name)
      expect(getPlanLockCopy(plan).tooltip).toContain(`plan ${name}`)
    }
  })

  it('plan desconocido: capitaliza la clave en vez de romper', () => {
    expect(planDisplayName('PLATINO')).toBe('Platino')
  })
})
