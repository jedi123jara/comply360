/**
 * Calendario: categoría/origen de cada evento → enlace a la pantalla donde
 * se actúa (calculadora de CTS, contrato, ficha del trabajador, SST…).
 *
 * Antes los eventos del calendario eran solo texto: el usuario veía "Depósito
 * CTS" o "Contrato por vencer" pero tenía que buscar por su cuenta dónde
 * hacer algo. Este módulo centraliza ese "¿y ahora qué hago?".
 *
 * Fuentes de los eventos:
 *  - Estáticos (se arman en la página): feriados, CTS, gratificación, AFP,
 *    T-Registro → enlace por categoría.
 *  - `/api/calendar`: cada evento trae un `id` con prefijo según su origen
 *    (`contract-exp-<id>`, `birthday-<workerId>`, `sst-emo-<id>`…). El
 *    endpoint no expone el enlace, así que lo derivamos del prefijo.
 *  - Eventos de alertas (`alert-<alertId>`): se cruzan con
 *    `/api/workers/alerts` y se reutiliza el mapeo de la página de alertas
 *    para llevar a la acción exacta (legajo, contratos, calculadora…).
 */

import {
  ROUTES as ALERT_ROUTES,
  resolveWorkerAlertAction,
  workerHref,
} from '@/app/dashboard/alertas/_lib/alert-actions'

export type EventCategory =
  | 'feriado'
  | 'cts'
  | 'gratificacion'
  | 'afp'
  | 'tregistro'
  | 'contrato'
  | 'sst'
  | 'cumpleanos'
  | 'alerta'
  | 'aniversario'
  | 'prueba'
  | 'vacaciones'
  | 'firma'
  | 'capacitacion'

export interface CalendarEventAction {
  href: string
  /** Texto del enlace, en imperativo y concreto ("Calcular CTS"). */
  label: string
}

/** Datos mínimos de una alerta de trabajador para resolver su destino. */
export interface AlertLookupEntry {
  workerId: string
  type: string
  title: string
}

/**
 * Enlace por defecto de cada categoría. `null` = evento informativo
 * (feriados, cumpleaños): no hay nada que hacer, así que no mostramos botón.
 */
export const CATEGORY_DEFAULT_ACTIONS: Record<EventCategory, CalendarEventAction | null> = {
  feriado: null,
  cts: { href: ALERT_ROUTES.calculadoraCts, label: 'Calcular CTS' },
  gratificacion: { href: ALERT_ROUTES.calculadoraGratificacion, label: 'Calcular gratificación' },
  afp: { href: ALERT_ROUTES.calculadoraAportes, label: 'Calcular aportes' },
  tregistro: { href: ALERT_ROUTES.trabajadores, label: 'Revisar trabajadores' },
  contrato: { href: '/dashboard/contratos', label: 'Ver contratos' },
  sst: { href: ALERT_ROUTES.sst, label: 'Ir a SST' },
  cumpleanos: null,
  alerta: { href: ALERT_ROUTES.alertas, label: 'Ver en alertas' },
  aniversario: { href: ALERT_ROUTES.trabajadores, label: 'Ver trabajadores' },
  prueba: { href: ALERT_ROUTES.trabajadores, label: 'Ver trabajadores' },
  vacaciones: { href: '/dashboard/vacaciones', label: 'Ver vacaciones' },
  firma: { href: '/dashboard/documentos-firma', label: 'Ver firmas pendientes' },
  capacitacion: { href: ALERT_ROUTES.sst, label: 'Ver capacitaciones SST' },
}

/**
 * Reglas por prefijo del `id` que devuelve `/api/calendar`. El orden importa:
 * los prefijos más específicos van primero.
 */
const SOURCE_ID_RULES: Array<{
  pattern: RegExp
  build: (match: RegExpMatchArray) => CalendarEventAction
}> = [
  {
    pattern: /^contract-exp-(.+)$/,
    build: (m) => ({ href: `/dashboard/contratos/${encodeURIComponent(m[1])}`, label: 'Ver contrato' }),
  },
  {
    pattern: /^probation-(.+)$/,
    build: (m) => ({ href: workerHref(m[1], 'contratos'), label: 'Decidir sobre el contrato' }),
  },
  {
    pattern: /^anniv-(.+)-\d+$/,
    build: (m) => ({ href: workerHref(m[1]), label: 'Ver trabajador' }),
  },
  {
    pattern: /^vacation-.+$/,
    build: () => ({ href: '/dashboard/vacaciones', label: 'Ver vacaciones' }),
  },
  {
    pattern: /^ack-deadline-.+$/,
    build: () => ({ href: '/dashboard/documentos-firma', label: 'Ver firmas pendientes' }),
  },
  {
    pattern: /^capacitacion-.+$/,
    build: () => ({ href: ALERT_ROUTES.sst, label: 'Ver capacitaciones SST' }),
  },
  {
    pattern: /^sst-emo-(.+)$/,
    build: (m) => ({ href: `${ALERT_ROUTES.sstEmo}/${encodeURIComponent(m[1])}`, label: 'Ver examen médico' }),
  },
  {
    pattern: /^sst-visita-(.+)$/,
    build: (m) => ({ href: `/dashboard/sst/visitas/${encodeURIComponent(m[1])}`, label: 'Ver visita' }),
  },
  {
    pattern: /^sst-sat-(.+)$/,
    build: (m) => ({ href: `${ALERT_ROUTES.sstAccidentes}/${encodeURIComponent(m[1])}`, label: 'Ver accidente' }),
  },
  {
    pattern: /^sst-comite-mandato-.+$/,
    build: () => ({ href: ALERT_ROUTES.sstComiteElecciones, label: 'Organizar elecciones' }),
  },
  {
    pattern: /^sst-plan-.+$/,
    build: () => ({ href: ALERT_ROUTES.sstPlanAnual, label: 'Ver plan anual SST' }),
  },
  {
    pattern: /^sst-memoria-.+$/,
    build: () => ({ href: '/dashboard/sst/memoria-anual', label: 'Ver memoria anual SST' }),
  },
]

export interface ResolveEventInput {
  category: EventCategory
  /** `id` original devuelto por `/api/calendar` (sin el prefijo `api-`). */
  sourceId?: string
}

/**
 * Devuelve el enlace de acción de un evento, o `null` si es informativo.
 *
 * Prioridad:
 *  1. Alertas de trabajador cruzadas con `alertsById` → acción exacta.
 *  2. Prefijo del `id` de la API → entidad concreta (contrato, EMO…).
 *  3. Enlace por defecto de la categoría.
 */
export function resolveCalendarEventAction(
  input: ResolveEventInput,
  alertsById?: ReadonlyMap<string, AlertLookupEntry>,
): CalendarEventAction | null {
  const { category, sourceId } = input

  if (sourceId) {
    const alertMatch = /^alert-(.+)$/.exec(sourceId)
    if (alertMatch) {
      const entry = alertsById?.get(alertMatch[1])
      if (entry) {
        const action = resolveWorkerAlertAction(entry)
        if (action && action.kind === 'link') return { href: action.href, label: 'Resolver ahora' }
      }
      return CATEGORY_DEFAULT_ACTIONS.alerta
    }

    for (const rule of SOURCE_ID_RULES) {
      const match = sourceId.match(rule.pattern)
      if (match) return rule.build(match)
    }
  }

  return CATEGORY_DEFAULT_ACTIONS[category] ?? null
}
