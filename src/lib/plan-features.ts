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
  | 'multi_empresa'        // Holding básico (BUSINESS+) o ilimitado (ENTERPRISE)
  | 'reportes_consolidados' // Reportes cross-empresa
  | 'csm_dedicado'         // Customer Success Manager
  | 'sla_garantizado'      // SLA 99.9% con créditos
  | 'webhooks_salientes'   // Webhooks API
  | 'white_label'          // Branding white-label
  | 'integracion_planilla' // Integración con Buk, Ofisis, etc.

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
    'multi_empresa',
    'reportes_consolidados',
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
    'multi_empresa',
    'reportes_consolidados',
    'csm_dedicado',
    'sla_garantizado',
    'webhooks_salientes',
    'white_label',
    'integracion_planilla',
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
  multi_empresa: 'BUSINESS',
  reportes_consolidados: 'BUSINESS',
  csm_dedicado: 'ENTERPRISE',
  sla_garantizado: 'ENTERPRISE',
  webhooks_salientes: 'ENTERPRISE',
  white_label: 'ENTERPRISE',
  integracion_planilla: 'ENTERPRISE',
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
