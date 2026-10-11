/**
 * Pendientes (`/dashboard/plan-accion`): cómo se MUESTRA cada pendiente.
 *
 * La API (`/api/plan-accion`) entrega los pendientes con códigos internos
 * (`area: "contratos_registro"`, `area: "DOCUMENTO_FALTANTE"`, `lane: "backlog"`).
 * Aquí los convertimos en lenguaje simple para alguien sin formación legal:
 * área con nombre legible, plazo en palabras, "por qué importa" y el destino
 * exacto del botón "Resolver".
 *
 * Funciones puras, sin React ni fetch → fáciles de testear.
 */

import {
  ALERT_SEVERITY_LABELS,
  getWorkerAlertConfig,
  resolveWorkerAlertAction,
} from '@/lib/alerts/alert-actions'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PlanSource = 'task' | 'alert' | 'training'
export type PlanSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type PlanLane = 'today' | 'week' | 'month' | 'backlog'

/** Filtro principal de la bandeja: horizonte de tiempo (acumulativo). */
export type TimeFilter = 'all' | 'today' | 'week' | 'month'

/** Filtro de avance (va en "Más filtros"). */
export type ProgressFilter = 'all' | 'needs_evidence' | 'unassigned' | 'ready_to_close'

/** Campos mínimos de un pendiente que usan estos helpers. */
export interface PlanItemRef {
  source: PlanSource
  severity: PlanSeverity
  area: string
  title: string
  description?: string | null
  routeHref: string
  routeLabel: string
  lane: PlanLane
  assignedTo?: string | null
  evidenceCount?: number
  workerName?: string
}

/** Estado de todos los filtros de la bandeja. */
export interface PlanFilters {
  query: string
  time: TimeFilter
  source: PlanSource | 'all'
  severity: PlanSeverity | 'all'
  progress: ProgressFilter
}

export const DEFAULT_PLAN_FILTERS: PlanFilters = {
  query: '',
  time: 'all',
  source: 'all',
  severity: 'all',
  progress: 'all',
}

// ─── Etiquetas ───────────────────────────────────────────────────────────────

/** Urgencia: mismas palabras que en Alertas ("Urgente", no "Crítica"). */
export const SEVERITY_LABELS: Record<PlanSeverity, string> = ALERT_SEVERITY_LABELS

/** Tipo de pendiente, en singular (etiqueta de cada fila). */
export const SOURCE_LABELS: Record<PlanSource, string> = {
  task: 'Tarea',
  alert: 'Alerta de trabajador',
  training: 'Capacitación',
}

/** Tipo de pendiente, en plural (chips de "Más filtros"). */
export const SOURCE_FILTER_LABELS: Record<PlanSource | 'all', string> = {
  all: 'Todos los tipos',
  task: 'Tareas',
  alert: 'Alertas de trabajadores',
  training: 'Capacitaciones',
}

/** Grupo de prioridad de cada fila, en lenguaje simple. */
export const LANE_LABELS: Record<PlanLane, string> = {
  today: 'Para hoy',
  week: 'Para esta semana',
  month: 'Para este mes',
  backlog: 'Más adelante',
}

export const TIME_FILTERS: TimeFilter[] = ['all', 'today', 'week', 'month']

export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  all: 'Todos',
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
}

export const PROGRESS_FILTERS: ProgressFilter[] = ['all', 'unassigned', 'needs_evidence', 'ready_to_close']

export const PROGRESS_FILTER_LABELS: Record<ProgressFilter, string> = {
  all: 'Cualquier avance',
  unassigned: 'Sin responsable',
  needs_evidence: 'Falta subir la prueba',
  ready_to_close: 'Listos para cerrar',
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

const LANE_ORDER: Record<PlanLane, number> = { today: 0, week: 1, month: 2, backlog: 3 }
const TIME_FILTER_MAX_LANE: Record<Exclude<TimeFilter, 'all'>, number> = { today: 0, week: 1, month: 2 }

/**
 * Los horizontes son acumulativos: "Esta semana" incluye lo de hoy y
 * "Este mes" incluye lo de esta semana. Es lo que espera quien pregunta
 * "¿qué tengo que hacer esta semana?".
 */
export function matchesTimeFilter(lane: PlanLane, filter: TimeFilter): boolean {
  if (filter === 'all') return true
  return LANE_ORDER[lane] <= TIME_FILTER_MAX_LANE[filter]
}

export function matchesProgressFilter(
  item: Pick<PlanItemRef, 'source' | 'assignedTo' | 'evidenceCount'>,
  filter: ProgressFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'needs_evidence') return item.source !== 'task' || (item.evidenceCount ?? 0) === 0
  if (filter === 'unassigned') return item.source === 'task' && !item.assignedTo?.trim()
  return item.source === 'task' && (item.evidenceCount ?? 0) > 0
}

/** Minúsculas y sin tildes: "capacitacion" encuentra "Capacitación". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-PE')
    .trim()
}

/** ¿El pendiente pasa todos los filtros? La búsqueda incluye el área legible. */
export function matchesPlanFilters(item: PlanItemRef, filters: PlanFilters): boolean {
  const query = normalizeSearch(filters.query)
  if (query) {
    const haystack = normalizeSearch(
      [item.title, item.description, planAreaLabel(item), item.assignedTo, item.workerName]
        .filter(Boolean)
        .join(' '),
    )
    if (!haystack.includes(query)) return false
  }
  if (filters.source !== 'all' && item.source !== filters.source) return false
  if (filters.severity !== 'all' && item.severity !== filters.severity) return false
  if (!matchesTimeFilter(item.lane, filters.time)) return false
  if (!matchesProgressFilter(item, filters.progress)) return false
  return true
}

/** Cuántos filtros de "Más filtros" están activos (para el contador del botón). */
export function countExtraFilters(filters: PlanFilters): number {
  return [filters.source !== 'all', filters.severity !== 'all', filters.progress !== 'all'].filter(Boolean).length
}

export function hasActiveFilters(filters: PlanFilters): boolean {
  return filters.time !== 'all' || filters.query.trim() !== '' || countExtraFilters(filters) > 0
}

/**
 * Nombre del trabajador a mostrar. Las alertas de empresa (IPERC, comité…)
 * se guardan con un trabajador de referencia: mostrarlo confundiría.
 */
export function planWorkerName(item: Pick<PlanItemRef, 'source' | 'area' | 'title' | 'workerName'>): string | null {
  const name = item.workerName?.trim()
  if (!name) return null
  if (item.source === 'alert' && getWorkerAlertConfig({ type: item.area, title: item.title })?.scope === 'org') {
    return null
  }
  return name
}

// ─── Área legible ────────────────────────────────────────────────────────────

/** `ComplianceTask.area` (diagnóstico, simulacro, organigrama). Igual que el cockpit. */
const TASK_AREA_LABELS: Record<string, string> = {
  contratos_registro: 'Contratos y registro',
  remuneraciones_beneficios: 'Remuneraciones y beneficios',
  jornada_descansos: 'Jornada y descansos',
  sst: 'Seguridad y salud en el trabajo',
  documentos_obligatorios: 'Documentos obligatorios',
  relaciones_laborales: 'Relaciones laborales',
  igualdad_nodiscriminacion: 'Igualdad y no discriminación',
  trabajadores_especiales: 'Trabajadores con protección especial',
  tercerizacion_intermediacion: 'Tercerización e intermediación',
  hostigamiento_sexual_detallado: 'Prevención del hostigamiento sexual',
  organigrama: 'Organigrama y comités',
}

/** `Course.category` de las capacitaciones obligatorias. */
const TRAINING_AREA_LABELS: Record<string, string> = {
  SST: 'Seguridad y salud en el trabajo',
  HOSTIGAMIENTO: 'Prevención del hostigamiento sexual',
  DERECHOS_LABORALES: 'Derechos laborales',
  CONTRATOS: 'Contratos',
  PLANILLA: 'Planilla y T-Registro',
  INSPECCIONES: 'Inspecciones de SUNAFIL',
  IGUALDAD: 'Igualdad salarial',
  GENERAL: 'Cumplimiento laboral',
}

/**
 * Área por tipo de alerta (`WorkerAlertType`). Gana el primer match.
 * Mismo criterio que `alertAreaLabel` del cockpit (`src/lib/cockpit/data.ts`),
 * que no se puede importar aquí porque ese módulo usa Prisma (servidor).
 */
const ALERT_AREA_RULES: Array<{ test: (type: string) => boolean; label: string }> = [
  { test: (t) => t.includes('CONTRATO') || t.includes('ADENDA'), label: 'Contratos' },
  { test: (t) => t.includes('CTS') || t.includes('GRATIFICACION'), label: 'Remuneraciones y beneficios' },
  { test: (t) => t.includes('VACACIONES'), label: 'Vacaciones' },
  { test: (t) => t.startsWith('T_REGISTRO'), label: 'Registro en planilla electrónica' },
  { test: (t) => t.includes('AFP'), label: 'Aportes previsionales' },
  { test: (t) => t.includes('SCTR'), label: 'Seguros obligatorios' },
  { test: (t) => t.includes('TARDANZA') || t.includes('AUSENTISMO'), label: 'Asistencia' },
  { test: (t) => t.includes('LICENCIA'), label: 'Licencias y descansos médicos' },
  { test: (t) => t.includes('DOCUMENTO') || t.includes('REGISTRO'), label: 'Legajo del trabajador' },
  {
    test: (t) =>
      t.includes('EXAMEN') ||
      t.startsWith('EMO_') ||
      t.includes('CAPACITACION') ||
      t.includes('IPERC') ||
      t.startsWith('SAT_') ||
      t.includes('COMITE') ||
      t.includes('SIMULACRO'),
    label: 'Seguridad y salud en el trabajo',
  },
]

function humanizeKey(raw: string): string {
  const text = raw.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

/** Nombre legible del área de un pendiente (nunca el código en mayúsculas). */
export function planAreaLabel(item: Pick<PlanItemRef, 'source' | 'area'>): string {
  const area = item.area?.trim() ?? ''
  if (!area) return 'General'
  if (item.source === 'alert') {
    const type = area.toUpperCase()
    return ALERT_AREA_RULES.find((rule) => rule.test(type))?.label ?? (humanizeKey(area) || 'General')
  }
  if (item.source === 'training') {
    return TRAINING_AREA_LABELS[area.toUpperCase()] ?? (humanizeKey(area) || 'Capacitación')
  }
  return TASK_AREA_LABELS[area.toLowerCase()] ?? (humanizeKey(area) || 'General')
}

/**
 * Término del glosario (`src/lib/glossary.ts`) que explica cada área, si lo
 * hay. Solo áreas que equivalen a un concepto: "Contratos" o "Remuneraciones y
 * beneficios" son demasiado amplias y no llevan "?".
 */
const AREA_TERM_IDS: Record<string, string> = {
  'Seguridad y salud en el trabajo': 'sst',
  'Prevención del hostigamiento sexual': 'hostigamiento-sexual',
  'Registro en planilla electrónica': 't-registro',
  'Planilla y T-Registro': 'planilla-electronica',
  'Inspecciones de SUNAFIL': 'inspeccion',
  'Legajo del trabajador': 'legajo',
  Vacaciones: 'vacaciones',
  // Solo lo generan las alertas de SCTR (ver ALERT_AREA_RULES).
  'Seguros obligatorios': 'sctr',
}

/** Id del glosario para el "?" junto al nombre del área, o `null` si no aplica. */
export function planAreaTermId(areaLabel: string): string | null {
  return AREA_TERM_IDS[areaLabel] ?? null
}

// ─── Por qué importa ─────────────────────────────────────────────────────────

export interface PlanWhy {
  /** `why` = consecuencia en lenguaje simple; `law` = norma que lo exige. */
  kind: 'why' | 'law'
  label: string
  text: string
}

/**
 * Textos conservadores por categoría de capacitación: explican la
 * consecuencia sin dar asesoría legal específica.
 */
const TRAINING_WHY: Record<string, string> = {
  SST: 'Las capacitaciones de seguridad y salud son obligatorias (Ley 29783) y SUNAFIL pide el registro de asistencia en sus inspecciones.',
  HOSTIGAMIENTO:
    'Capacitar al personal en prevención del hostigamiento sexual es obligatorio (Ley 27942). Guarda la constancia de asistencia.',
}
const TRAINING_WHY_DEFAULT =
  'Es una capacitación obligatoria de tu empresa. Guarda la constancia de asistencia como prueba.'

/**
 * Línea "Por qué importa" o "Base legal" de un pendiente, si hay dato:
 *  - Alertas: el texto del mapeo compartido de alertas.
 *  - Tareas: la base legal guardada en la tarea (`ComplianceTask.baseLegal`).
 *  - Capacitaciones: texto por categoría del curso.
 * Si no hay dato confiable devuelve `null` (no inventamos normas).
 */
export function planWhyItMatters(
  item: Pick<PlanItemRef, 'source' | 'area' | 'title'>,
  extra: { baseLegal?: string | null } = {},
): PlanWhy | null {
  if (item.source === 'alert') {
    const text = getWorkerAlertConfig({ type: item.area, title: item.title })?.whyItMatters
    return text ? { kind: 'why', label: 'Por qué importa', text } : null
  }
  if (item.source === 'training') {
    return {
      kind: 'why',
      label: 'Por qué importa',
      text: TRAINING_WHY[item.area?.toUpperCase() ?? ''] ?? TRAINING_WHY_DEFAULT,
    }
  }
  const baseLegal = extra.baseLegal?.trim()
  return baseLegal ? { kind: 'law', label: 'Base legal', text: baseLegal } : null
}

// ─── Botón "Resolver" ────────────────────────────────────────────────────────

export interface PlanAction {
  href: string
  /** Texto del enlace en el panel de detalle ("Ir a: Legajo del trabajador"). */
  label: string
  /** Pantalla de destino en palabras, si la conocemos. */
  destination: string | null
}

/**
 * Destino del botón "Resolver" de un pendiente.
 *  - Alertas: el MISMO mapeo que el botón "Resolver ahora" de Alertas
 *    (legajo, contratos, calculadora de CTS, SST…). Si el destino es la ficha
 *    del trabajador y aún no sabemos quién es (`workerId`), usamos la ruta que
 *    trae la API para no mandar a una lista genérica.
 *  - Tareas y capacitaciones: la ruta que ya calcula la API.
 */
export function resolvePlanAction(
  item: Pick<PlanItemRef, 'source' | 'area' | 'title' | 'routeHref' | 'routeLabel'>,
  workerId?: string | null,
): PlanAction {
  if (item.source === 'alert') {
    const ref = { type: item.area, title: item.title, workerId: workerId ?? null }
    const config = getWorkerAlertConfig(ref)
    const canResolve = Boolean(workerId?.trim()) || config?.route.to === 'page'
    if (canResolve) {
      const action = resolveWorkerAlertAction(ref)
      if (action?.kind === 'link') {
        return { href: action.href, label: `Ir a: ${action.destination}`, destination: action.destination }
      }
    }
  }
  return { href: item.routeHref, label: item.routeLabel, destination: null }
}

// ─── Errores ─────────────────────────────────────────────────────────────────

/**
 * Mensaje entendible para un error HTTP. Para 400/409/413/415/422 confiamos
 * en el mensaje del servidor (suele explicar qué falta, p. ej. "Adjunta
 * evidencia…"); para el resto, algunas APIs responden en inglés o con
 * jerga técnica, así que usamos un texto propio.
 */
export function friendlyHttpError(
  status: number,
  serverMessage?: string | null,
  fallback = 'No pudimos guardar el cambio. Intenta de nuevo en unos segundos.',
): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (status === 403) return 'Tu plan o tu rol no te permite hacer este cambio.'
  if (status === 404) return 'Este pendiente ya no existe. Pulsa "Actualizar" para ver la lista al día.'
  if (status === 413) return 'El archivo es muy pesado. Prueba con uno más liviano.'
  const message = serverMessage?.trim()
  if (message && status >= 400 && status < 500) return message
  return fallback
}

/** Mensaje entendible para cualquier error atrapado en un `catch`. */
export function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof TypeError) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
