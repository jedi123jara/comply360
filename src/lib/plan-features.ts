/**
 * Plan features & feature gating — **client-safe constants**.
 *
 * Exportado aparte de `plan-gate.ts` para que el sidebar (client component)
 * pueda importar sin arrastrar dependencias de Next server (prisma, NextResponse).
 *
 * Cambios acá se reflejan en:
 *   - UI: sidebar lock icon, topbar score pill
 *   - Server: `plan-gate.ts` re-exporta estos valores
 */

export type PlanFeature =
  | 'calculadoras'
  | 'workers'
  | 'alertas_basicas'
  | 'calendario'
  | 'contratos'
  | 'diagnostico'
  | 'simulacro_basico'
  | 'reportes_pdf'
  | 'ia_contratos'
  | 'asistente_ia'
  | 'review_ia'
  | 'simulacro_completo'
  | 'denuncias'
  | 'sst_completo'
  | 'api_access'
  | 'gamificacion'
  | 'attendance_selfie'
  | 'organigrama'           // Organigrama básico CRUD + Compliance Mesh (PRO+)
  | 'organigrama_completo'  // AI Org Doctor + Time travel + Auditor Link (EMPRESA+)
  | 'multi_empresa'        // Holding básico (BUSINESS+) o ilimitado (ENTERPRISE)
  | 'reportes_consolidados' // Reportes cross-empresa
  | 'csm_dedicado'         // Customer Success Manager
  | 'sla_garantizado'      // SLA 99.9% con créditos
  | 'webhooks_salientes'   // Webhooks API
  | 'white_label'          // Branding white-label
  | 'integracion_planilla' // Integración con Buk, Ofisis, etc.
  // Ola 1+2 — módulo Trabajadores hardening (2026-05)
  | 't_registro_export'        // Exportar XML T-REGISTRO SUNAT (gancho EMPRESA)
  | 'sync_planilla_externa'    // Sync bidireccional Buk/Ofisis (lock-in PRO)
  | 'historial_extendido_12m'  // WorkerHistoryEvent: ventana 12 meses (EMPRESA)
  | 'historial_infinito'       // WorkerHistoryEvent: sin límite (PRO)

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
    // Ola 1+2 — workers hardening
    't_registro_export',
    'historial_extendido_12m',
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
 * Feature → plan mínimo que la habilita.
 * Usado por el sidebar para decidir cuándo mostrar el icono de lock y
 * cuál es el plan recomendado en el tooltip.
 */
export const FEATURE_MIN_PLAN: Record<PlanFeature, string> = {
  calculadoras: 'FREE',
  workers: 'STARTER',
  alertas_basicas: 'STARTER',
  calendario: 'STARTER',
  contratos: 'STARTER',
  diagnostico: 'EMPRESA',
  simulacro_basico: 'EMPRESA',
  reportes_pdf: 'EMPRESA',
  ia_contratos: 'EMPRESA',
  gamificacion: 'EMPRESA',
  asistente_ia: 'PRO',
  review_ia: 'PRO',
  simulacro_completo: 'PRO',
  denuncias: 'PRO',
  sst_completo: 'PRO',
  api_access: 'PRO',
  attendance_selfie: 'PRO',
  organigrama: 'PRO',
  organigrama_completo: 'EMPRESA',
  multi_empresa: 'BUSINESS',
  reportes_consolidados: 'BUSINESS',
  csm_dedicado: 'ENTERPRISE',
  sla_garantizado: 'ENTERPRISE',
  webhooks_salientes: 'ENTERPRISE',
  white_label: 'ENTERPRISE',
  integracion_planilla: 'ENTERPRISE',
  // Ola 1+2 — workers hardening
  t_registro_export: 'EMPRESA',
  sync_planilla_externa: 'PRO',
  historial_extendido_12m: 'EMPRESA',
  historial_infinito: 'PRO',
}

/**
 * Mapa ruta → feature que gatea. Usado por la sidebar para poner lock
 * en items sin acceso según el plan actual.
 *
 * Extenderlo aquí (no en el sidebar) al agregar nuevas rutas gating.
 */
export const ROUTE_FEATURE_MAP: Record<string, PlanFeature> = {
  '/dashboard/diagnostico': 'diagnostico',
  '/dashboard/simulacro': 'simulacro_basico',
  '/dashboard/ia-laboral': 'asistente_ia',
  '/dashboard/asistente-ia': 'asistente_ia',
  '/dashboard/analizar-contrato': 'review_ia',
  '/dashboard/denuncias': 'denuncias',
  '/dashboard/sst': 'sst_completo',
  '/dashboard/api-docs': 'api_access',
  '/dashboard/gamificacion': 'gamificacion',
  '/dashboard/organigrama': 'organigrama',
}

export function planHasFeature(plan: string, feature: PlanFeature): boolean {
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
  return features.includes(feature)
}

export function isRouteLocked(plan: string, href: string): boolean {
  const req = ROUTE_FEATURE_MAP[href]
  if (!req) return false
  return !planHasFeature(plan, req)
}

/**
 * Rollout flags — banderas de despliegue gradual independientes del plan.
 *
 * A diferencia de `PLAN_FEATURES` (que gatea por plan comercial), estas
 * banderas controlan rollout de UI nueva (canary, beta, opt-in) y se evalúan
 * por env var + override por organización.
 *
 * Uso:
 *   import { isRolloutEnabled } from '@/lib/plan-features'
 *   if (isRolloutEnabled('orgchart_v2', orgId)) { ... }
 *
 * En cliente, exportamos la lista cruda para que sea tree-shakeable y
 * funcione en Server Components.
 */
export type RolloutFlag = 'orgchart_v2'

export const ROLLOUT_FLAGS: Record<RolloutFlag, { envVar: string; description: string }> = {
  orgchart_v2: {
    envVar: 'NEXT_PUBLIC_ORGCHART_V2',
    description: 'Rediseño visual del organigrama con @xyflow/react + Compliance Heatmap + Smart Nudges',
  },
}

/**
 * Lista de orgIds permitidos por flag (override). Se puede llenar via env var
 * `ORGCHART_V2_ORGS=orgA,orgB,orgC` o hardcodear durante beta.
 *
 * El env-var siempre tiene precedencia: si NEXT_PUBLIC_ORGCHART_V2=true → todos.
 */
function getAllowedOrgIds(flag: RolloutFlag): Set<string> {
  if (flag === 'orgchart_v2') {
    const raw = process.env.ORGCHART_V2_ORGS ?? ''
    return new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
  }
  return new Set()
}

export function isRolloutEnabled(flag: RolloutFlag, orgId?: string | null): boolean {
  const cfg = ROLLOUT_FLAGS[flag]
  if (!cfg) return false
  // 1) global env-var → todos los tenants
  if (process.env[cfg.envVar] === 'true') return true
  // 2) override por orgId (whitelist)
  if (orgId && getAllowedOrgIds(flag).has(orgId)) return true
  return false
}
