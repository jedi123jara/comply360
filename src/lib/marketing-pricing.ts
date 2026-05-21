import { PLANS } from '@/lib/constants'
import { formatSolesMarketing } from '@/lib/format/peruvian'

export type MarketingPlanKey = 'FREE' | 'STARTER' | 'PRO' | 'EMPRESA' | 'ENTERPRISE'

export const LANDING_PLAN_ORDER: MarketingPlanKey[] = ['STARTER', 'PRO', 'EMPRESA']
export const FULL_PLAN_ORDER: MarketingPlanKey[] = ['FREE', 'STARTER', 'PRO', 'EMPRESA', 'ENTERPRISE']
export const FEATURED_MARKETING_PLAN: MarketingPlanKey = 'PRO'
export const ENTERPRISE_STARTING_PRICE = 4990

export const PLAN_POSITIONING: Record<
  MarketingPlanKey,
  {
    tagline: string
    audience: string
    outcome: string
  }
> = {
  FREE: {
    tagline: 'Explora el riesgo laboral sin tarjeta',
    audience: 'Para validar calculadoras, calendario y diagnóstico express.',
    outcome: 'Primer mapa de riesgo y herramientas base.',
  },
  STARTER: {
    tagline: 'Para ordenar una MYPE',
    audience: 'Hasta 20 trabajadores con legajos, contratos y alertas básicas.',
    outcome: 'Sales de Excel y carpetas sueltas sin una implementación pesada.',
  },
  PRO: {
    tagline: 'Más elegido para crecer con control',
    audience: 'Hasta 75 trabajadores con IA, SST, simulacro SUNAFIL y denuncias.',
    outcome: 'Tu equipo opera con evidencia diaria y menos improvisación.',
  },
  EMPRESA: {
    tagline: 'Para operación multi-sede',
    audience: 'Hasta 250 trabajadores con portal trabajador, e-learning y reportes.',
    outcome: 'Gerencia, RRHH, SST y trabajadores trabajan sobre el mismo expediente vivo.',
  },
  ENTERPRISE: {
    tagline: 'Para corporativos y holdings',
    audience: '300+ trabajadores, integraciones, SLA dedicado y gobierno multi-empresa.',
    outcome: 'Compliance laboral como infraestructura crítica.',
  },
}

export function getMarketingPlanPitch(planKey: MarketingPlanKey) {
  return PLAN_POSITIONING[planKey].audience
}

export function getMarketingPlanOutcome(planKey: MarketingPlanKey) {
  return PLAN_POSITIONING[planKey].outcome
}

export function getMarketingPlanPrice(planKey: MarketingPlanKey) {
  const plan = PLANS[planKey]
  if (planKey === 'ENTERPRISE') return `Desde ${formatSolesMarketing(ENTERPRISE_STARTING_PRICE)}`
  if (plan.price === 0) return 'Gratis'
  return formatSolesMarketing(plan.price)
}

export function getMarketingPlanLimit(planKey: MarketingPlanKey) {
  const plan = PLANS[planKey]
  if (planKey === 'ENTERPRISE') return '300+ trabajadores'
  if (planKey === 'FREE') return 'Hasta 5 trabajadores'
  return `Hasta ${plan.maxWorkers.toLocaleString('es-PE')} trabajadores`
}

export function cleanPlanFeature(feature: string) {
  return feature.replace(/[^\p{L}\p{N}\s/().,+-]/gu, '').replace(/\s+/g, ' ').trim()
}
