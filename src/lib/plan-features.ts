/**
 * Plan features & feature gating — **client-safe constants**.
 *
 * Exportado aparte de `plan-gate.ts` para que el sidebar (client component)
 * pueda importar sin arrastrar dependencias de Next server (prisma, NextResponse).
 *
 * Cambios acá se reflejan en:
 *   - UI: candado del sidebar, vista previa de funciones bloqueadas, topbar
 *   - Server: `plan-gate.ts` re-exporta estos valores (el 403 informa el plan mínimo)
 *
 * Fuente de verdad única: `PLAN_FEATURES` (qué incluye cada plan). El plan
 * mínimo de cada función (`FEATURE_MIN_PLAN`) se DERIVA de esa matriz, así
 * que nunca puede contradecirla.
 */

import { PLANS } from '@/lib/constants'

/**
 * Todas las funciones con candado de plan. Es la lista en tiempo de ejecución
 * que permite derivar `FEATURE_MIN_PLAN` y testear que cada función tenga un
 * plan que la incluya.
 */
export const ALL_PLAN_FEATURES = [
  'calculadoras',
  'workers',
  'alertas_basicas',
  'calendario',
  'contratos',
  'diagnostico',
  'simulacro_basico',
  'reportes_pdf',
  'ia_contratos',
  'asistente_ia',
  'review_ia',
  'simulacro_completo',
  'denuncias',
  'sst_completo',
  'api_access',
  'gamificacion',
  'attendance_selfie',
  'organigrama', // Organigrama básico CRUD + Compliance Mesh
  'organigrama_completo', // AI Org Doctor + Time travel + Auditor Link
  'multi_empresa', // Holding básico o ilimitado
  'reportes_consolidados', // Reportes cross-empresa
  'csm_dedicado', // Customer Success Manager
  'sla_garantizado', // SLA 99.9% con créditos
  'webhooks_salientes', // Webhooks API
  'white_label', // Branding white-label
  'integracion_planilla', // Integración con Buk, Ofisis, etc.
  // Ola 1+2 — módulo Trabajadores hardening (2026-05)
  't_registro_export', // Exportar XML T-REGISTRO SUNAT
  'sync_planilla_externa', // Sync bidireccional Buk/Ofisis
  'historial_extendido_12m', // WorkerHistoryEvent: ventana 12 meses
  'historial_infinito', // WorkerHistoryEvent: sin límite
] as const

export type PlanFeature = (typeof ALL_PLAN_FEATURES)[number]

export const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  FREE: ['calculadoras'],
  STARTER: [
    'calculadoras',
    'workers',
    'alertas_basicas',
    'calendario',
    'contratos',
  ],
  EMPRESA: [
    'calculadoras',
    'workers',
    'alertas_basicas',
    'calendario',
    'contratos',
    'diagnostico',
    'simulacro_basico',
    'reportes_pdf',
    'ia_contratos',
    'gamificacion',
    'organigrama',
    'organigrama_completo',
    // FIX (billing): EMPRESA (S/1899) es el tier MÁS caro, por encima de PRO (S/699),
    // así que debe ser superset estricto de PRO. Antes le faltaban estas 9 features y
    // un cliente EMPRESA recibía 403 PLAN_UPGRADE_REQUIRED en Copilot IA, AI Review,
    // SST, denuncias, etc. — features por las que pagaba MÁS que un cliente PRO.
    'asistente_ia',
    'review_ia',
    'simulacro_completo',
    'denuncias',
    'sst_completo',
    'api_access',
    'attendance_selfie',
    // Ola 1+2 — workers hardening
    't_registro_export',
    'historial_extendido_12m',
    'historial_infinito',
    'sync_planilla_externa',
  ],
  PRO: [
    'calculadoras',
    'workers',
    'alertas_basicas',
    'calendario',
    'contratos',
    'diagnostico',
    'simulacro_basico',
    'reportes_pdf',
    'ia_contratos',
    'asistente_ia',
    'review_ia',
    'simulacro_completo',
    'denuncias',
    'sst_completo',
    'api_access',
    'gamificacion',
    'attendance_selfie',
    'organigrama',
    // Ola 1+2 — workers hardening (PRO incluye todo de EMPRESA)
    't_registro_export',
    'historial_extendido_12m',
    'historial_infinito',
    'sync_planilla_externa',
  ],
  BUSINESS: [
    'calculadoras',
    'workers',
    'alertas_basicas',
    'calendario',
    'contratos',
    'diagnostico',
    'simulacro_basico',
    'reportes_pdf',
    'ia_contratos',
    'asistente_ia',
    'review_ia',
    'simulacro_completo',
    'denuncias',
    'sst_completo',
    'api_access',
    'gamificacion',
    'attendance_selfie',
    'organigrama',
    'organigrama_completo',
    'multi_empresa',
    'reportes_consolidados',
    // hereda workers hardening
    't_registro_export',
    'historial_extendido_12m',
    'historial_infinito',
    'sync_planilla_externa',
  ],
  ENTERPRISE: [
    'calculadoras',
    'workers',
    'alertas_basicas',
    'calendario',
    'contratos',
    'diagnostico',
    'simulacro_basico',
    'reportes_pdf',
    'ia_contratos',
    'asistente_ia',
    'review_ia',
    'simulacro_completo',
    'denuncias',
    'sst_completo',
    'api_access',
    'gamificacion',
    'attendance_selfie',
    'organigrama',
    'organigrama_completo',
    'multi_empresa',
    'reportes_consolidados',
    'csm_dedicado',
    'sla_garantizado',
    'webhooks_salientes',
    'white_label',
    'integracion_planilla',
    // hereda workers hardening
    't_registro_export',
    'historial_extendido_12m',
    'historial_infinito',
    'sync_planilla_externa',
  ],
}

/**
 * Planes que se venden hoy, del más barato al más caro (precio mensual;
 * ENTERPRISE es cotización a medida "desde S/4,990", por eso va al final).
 *
 * BUSINESS queda fuera a propósito: es un plan legacy que ya no se vende,
 * así que nunca debe recomendarse como "plan mínimo". Un test verifica que
 * este orden coincida con los precios de `PLANS`.
 */
export const PLAN_TIER_ORDER = ['FREE', 'STARTER', 'PRO', 'EMPRESA', 'ENTERPRISE'] as const

export type SellablePlanKey = (typeof PLAN_TIER_ORDER)[number]

/** Plan más barato (entre los que se venden) que incluye la función. */
function cheapestPlanWith(feature: PlanFeature): SellablePlanKey {
  for (const plan of PLAN_TIER_ORDER) {
    if (PLAN_FEATURES[plan]?.includes(feature)) return plan
  }
  // Ningún plan vendible la incluye (no debería pasar; hay test). Lo más
  // honesto es derivar a una cotización a medida.
  return 'ENTERPRISE'
}

/**
 * Feature → plan mínimo que la habilita, DERIVADO de `PLAN_FEATURES`.
 *
 * Antes era una tabla escrita a mano y se desfasó: pedía EMPRESA (S/1,899)
 * para diagnóstico, simulacro y reportes aunque PRO (S/699) ya los incluía,
 * así que el candado empujaba al plan más caro. Ahora es siempre el plan más
 * barato que de verdad incluye la función.
 *
 * Usado por: sidebar (candado), vista previa de funciones bloqueadas y el
 * 403 `PLAN_UPGRADE_REQUIRED` del servidor (`plan-gate.ts`).
 */
export const FEATURE_MIN_PLAN: Record<PlanFeature, SellablePlanKey> = Object.fromEntries(
  ALL_PLAN_FEATURES.map((feature) => [feature, cheapestPlanWith(feature)]),
) as Record<PlanFeature, SellablePlanKey>

/**
 * Mapa ruta → feature que gatea. El bloqueo aplica por PREFIJO: si
 * `/dashboard/sst` está bloqueada, también lo están `/dashboard/sst/emo`,
 * `/dashboard/sst/comite/elecciones`, etc. Si una subruta necesita otra
 * función, se agrega aquí con su propia entrada: la coincidencia más
 * específica gana.
 *
 * Solo se agregan rutas cuya página depende por completo de APIs con ese
 * candado (si no, el usuario ve un candado en algo que sí puede usar).
 *
 * Extenderlo aquí (no en el sidebar) al agregar nuevas rutas gating.
 */
export const ROUTE_FEATURE_MAP: Record<string, PlanFeature> = {
  '/dashboard/centro-sunafil': 'diagnostico',
  '/dashboard/diagnostico': 'diagnostico',
  '/dashboard/simulacro': 'simulacro_basico',
  '/dashboard/ia-laboral': 'asistente_ia',
  '/dashboard/asistente-ia': 'asistente_ia',
  '/dashboard/analizar-contrato': 'review_ia',
  '/dashboard/denuncias': 'denuncias',
  '/dashboard/sst': 'sst_completo',
  // EPP usa /api/sst/epp, que el servidor protege con `diagnostico` (no `sst_completo`).
  '/dashboard/sst/epp': 'diagnostico',
  '/dashboard/api-docs': 'api_access',
  '/dashboard/gamificacion': 'gamificacion',
  '/dashboard/organigrama': 'organigrama',
  // Páginas cuyas APIs ya devolvían 403 a planes menores y no mostraban candado:
  '/dashboard/asistencia': 'attendance_selfie', // /api/attendance/*
  '/dashboard/tareas': 'diagnostico', // /api/compliance-tasks
  '/dashboard/sunafil-ready': 'diagnostico', // /api/sunafil-ready
  '/dashboard/igualdad-salarial': 'reportes_pdf', // /api/igualdad-salarial
  '/dashboard/configuracion/empresa/plantillas': 'ia_contratos', // /api/org-templates
  '/dashboard/decisiones': 'ia_contratos', // /api/decisiones/*
}

/**
 * Subrutas LIBRES dentro de una sección bloqueada (excepciones). Ejemplo: si
 * algún día `/dashboard/sst/onboarding` debe ser libre aunque `/dashboard/sst`
 * tenga candado, se agrega aquí. Gana sobre una entrada de `ROUTE_FEATURE_MAP`
 * igual o menos específica.
 */
export const UNGATED_ROUTES: readonly string[] = []

/** Quita query/hash y la barra final para comparar rutas. */
function normalizePath(href: string): string {
  const path = href.split(/[?#]/)[0] || '/'
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/** `/a/b` coincide con `/a/b` y `/a/b/...`, pero NO con `/a/bc`. */
function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

/**
 * Resuelve qué función protege una ruta, por prefijo y con la coincidencia
 * más específica (la más larga) ganando. Devuelve `null` si la ruta es libre.
 *
 * Los mapas son inyectables solo para testear la regla de especificidad.
 */
export function resolveRouteFeature(
  href: string,
  routeMap: Readonly<Record<string, PlanFeature>> = ROUTE_FEATURE_MAP,
  ungatedRoutes: readonly string[] = UNGATED_ROUTES,
): PlanFeature | null {
  const path = normalizePath(href)
  let bestLength = -1
  let bestFeature: PlanFeature | null = null

  for (const [prefix, feature] of Object.entries(routeMap)) {
    const normalized = normalizePath(prefix)
    if (matchesPrefix(path, normalized) && normalized.length > bestLength) {
      bestLength = normalized.length
      bestFeature = feature
    }
  }
  for (const prefix of ungatedRoutes) {
    const normalized = normalizePath(prefix)
    // `>=`: una excepción explícita gana ante una entrada igual de específica.
    if (matchesPrefix(path, normalized) && normalized.length >= bestLength) {
      bestLength = normalized.length
      bestFeature = null
    }
  }
  return bestFeature
}

/** Función que protege la ruta (por prefijo) o `null` si es libre. */
export function getRouteFeature(href: string): PlanFeature | null {
  return resolveRouteFeature(href)
}

/** Plan más barato que desbloquea la ruta, o `null` si la ruta es libre. */
export function getRouteMinPlan(href: string): SellablePlanKey | null {
  const feature = getRouteFeature(href)
  return feature ? FEATURE_MIN_PLAN[feature] : null
}

export function planHasFeature(plan: string, feature: PlanFeature): boolean {
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
  return features.includes(feature)
}

/**
 * ¿La ruta está bloqueada para este plan? Bloquea por prefijo: si una
 * sección tiene candado, también sus subrutas (salvo excepciones).
 * Firma estable: la usa el sidebar.
 */
export function isRouteLocked(plan: string, href: string): boolean {
  const req = getRouteFeature(href)
  if (!req) return false
  return !planHasFeature(plan, req)
}

/* ── Textos del candado ─────────────────────────────────────────────── */

/** Nombre comercial del plan ("Pro", "Empresa"), nunca abreviaturas. */
export function planDisplayName(plan: string): string {
  const data = (PLANS as Record<string, { name: string } | undefined>)[plan]
  if (data) return data.name
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
}

export interface PlanLockCopy {
  /** Nombre real del plan: "Pro", "Empresa". */
  planName: string
  /** Etiqueta del candado: "Disponible desde Pro". */
  label: string
  /** Versión compacta para espacios chicos: "Desde Pro". */
  shortLabel: string
  /** Tooltip / aria-label: explica qué pasa al hacer clic. */
  tooltip: string
}

/** Textos del candado para un plan mínimo (sin abreviaturas tipo "EMP"). */
export function getPlanLockCopy(plan: string): PlanLockCopy {
  const planName = planDisplayName(plan)
  return {
    planName,
    label: `Disponible desde ${planName}`,
    shortLabel: `Desde ${planName}`,
    tooltip: `Disponible desde el plan ${planName}. Haz clic para ver qué hace y cuánto cuesta.`,
  }
}
