/**
 * Resuelve la ruta destino donde el usuario puede subsanar una `ComplianceTask`.
 *
 * Las tasks nacen de 3 fuentes (ver `task-spawner.ts` y `org-doctor/index.ts`):
 *  1. Diagnóstico FULL/EXPRESS  → `sourceId` = `questionId` (ej. "CR-01", "SST-03").
 *  2. Simulacro SUNAFIL          → `sourceId` = `solicitudId`, `area` = "documentos_obligatorios".
 *  3. OrgDoctor (organigrama)    → `sourceId` = `rule` (ej. "committee-sst-no-president"), `area` = "organigrama".
 *
 * Devuelve null si no hay ruta confiable: el caller debe esconder el CTA en ese caso.
 */

export interface TaskRouteHint {
  /** sourceId del task — questionId, solicitudId o rule del OrgDoctor. */
  sourceId: string | null
  /** Bucket de área (organigrama, sst, contratos_registro, etc.). */
  area: string
}

export interface ResolvedTaskRoute {
  href: string
  label: string
}

/* ── Mapeo por rule del OrgDoctor (área = "organigrama") ─────────────── */

const ORG_DOCTOR_RULE_ROUTES: Record<string, ResolvedTaskRoute> = {
  // Comité SST — Ley 29783 art. 29
  'committee-sst-no-president': { href: '/dashboard/sst/comite', label: 'Ir al Comité SST' },
  'committee-sst-no-secretary': { href: '/dashboard/sst/comite', label: 'Ir al Comité SST' },
  'committee-sst-no-worker-rep': { href: '/dashboard/sst/comite/elecciones', label: 'Convocar elecciones' },
  'committee-sst-no-employer-rep': { href: '/dashboard/sst/comite', label: 'Ir al Comité SST' },
  'committee-sst-imbalanced': { href: '/dashboard/sst/comite', label: 'Ajustar composición del Comité' },
  'sst-no-supervisor': { href: '/dashboard/organigrama', label: 'Designar Supervisor en el organigrama' },

  // Comité Hostigamiento Sexual — Ley 27942
  'comite-hostigamiento-missing': { href: '/dashboard/organigrama', label: 'Constituir Comité en el organigrama' },
  'hostigamiento-no-receiver': { href: '/dashboard/organigrama', label: 'Designar receptor en el organigrama' },

  // DPO Ley 29733
  'dpo-not-designated': { href: '/dashboard/organigrama', label: 'Designar DPO en el organigrama' },

  // Estructura organizacional
  'vacant-positions': { href: '/dashboard/organigrama', label: 'Ver puestos vacantes' },
  'expiring-roles': { href: '/dashboard/organigrama', label: 'Renovar roles por vencer' },
  'mof-incomplete': { href: '/dashboard/organigrama', label: 'Completar MOF' },
  'span-of-control-exceeded': { href: '/dashboard/organigrama', label: 'Revisar span of control' },
  'succession-coverage-low': { href: '/dashboard/organigrama', label: 'Definir planes de sucesión' },
  'subordination-risk': { href: '/dashboard/organigrama', label: 'Revisar líneas de reporte' },
}

/* ── Mapeo por prefijo de questionId del diagnóstico ─────────────────── */

const QUESTION_PREFIX_ROUTES: Array<{ prefix: string; route: ResolvedTaskRoute }> = [
  // Contratos y registro (CR-XX)
  { prefix: 'CR-', route: { href: '/dashboard/contratos', label: 'Ir a contratos' } },
  // Remuneraciones y beneficios (RB-XX) — boletas y planilla
  { prefix: 'RB-', route: { href: '/dashboard/planilla', label: 'Ir a planilla' } },
  // Jornada y descansos (JD-XX)
  { prefix: 'JD-', route: { href: '/dashboard/asistencia', label: 'Ir a control de asistencia' } },
  // SST (SST-XX)
  { prefix: 'SST-', route: { href: '/dashboard/sst', label: 'Ir a SST' } },
  // Documentos obligatorios (DO-XX) — legajo de trabajadores
  { prefix: 'DO-', route: { href: '/dashboard/trabajadores', label: 'Ir a legajo de trabajadores' } },
  // Relaciones laborales (RL-XX)
  { prefix: 'RL-', route: { href: '/dashboard/relaciones-colectivas', label: 'Ir a relaciones colectivas' } },
  // Igualdad y no discriminación (IN-XX)
  { prefix: 'IN-', route: { href: '/dashboard/igualdad-salarial', label: 'Ir a igualdad salarial' } },
  // Trabajadores especiales (TE-XX)
  { prefix: 'TE-', route: { href: '/dashboard/trabajadores', label: 'Ir a trabajadores' } },
  // Tercerización e intermediación (TI-XX)
  { prefix: 'TI-', route: { href: '/dashboard/prestadores', label: 'Ir a prestadores' } },
  // Hostigamiento sexual procedimiento (HS-XX)
  { prefix: 'HS-', route: { href: '/dashboard/denuncias', label: 'Ir al canal de denuncias' } },
]

/* ── Mapeo por área (fallback general) ───────────────────────────────── */

const AREA_ROUTES: Record<string, ResolvedTaskRoute> = {
  organigrama: { href: '/dashboard/organigrama', label: 'Ir al organigrama' },
  sst: { href: '/dashboard/sst', label: 'Ir a SST' },
  documentos_obligatorios: { href: '/dashboard/trabajadores', label: 'Ir a legajo de trabajadores' },
  contratos_registro: { href: '/dashboard/contratos', label: 'Ir a contratos' },
  remuneraciones_beneficios: { href: '/dashboard/planilla', label: 'Ir a planilla' },
  jornada_descansos: { href: '/dashboard/asistencia', label: 'Ir a control de asistencia' },
  relaciones_laborales: { href: '/dashboard/relaciones-colectivas', label: 'Ir a relaciones colectivas' },
  igualdad_nodiscriminacion: { href: '/dashboard/igualdad-salarial', label: 'Ir a igualdad salarial' },
  trabajadores_especiales: { href: '/dashboard/trabajadores', label: 'Ir a trabajadores' },
  tercerizacion_intermediacion: { href: '/dashboard/prestadores', label: 'Ir a prestadores' },
  hostigamiento_sexual_detallado: { href: '/dashboard/denuncias', label: 'Ir al canal de denuncias' },
}

export function resolveTaskRoute(task: TaskRouteHint): ResolvedTaskRoute | null {
  const source = task.sourceId?.trim() ?? ''

  // 1) Match exacto por rule del OrgDoctor
  if (source && ORG_DOCTOR_RULE_ROUTES[source]) {
    return ORG_DOCTOR_RULE_ROUTES[source]
  }

  // 2) Match por prefijo de questionId del diagnóstico
  if (source) {
    for (const { prefix, route } of QUESTION_PREFIX_ROUTES) {
      if (source.startsWith(prefix)) return route
    }
  }

  // 3) Fallback por área
  if (task.area && AREA_ROUTES[task.area]) {
    return AREA_ROUTES[task.area]
  }

  return null
}
