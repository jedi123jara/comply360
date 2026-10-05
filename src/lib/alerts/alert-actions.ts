/**
 * Mapeo centralizado: tipo de alerta → acción concreta que la corrige.
 *
 * Por qué existe: antes cada alerta solo ofrecía "Resolver" (que marcaba la
 * alerta como leída sin corregir nada) o "Ver trabajador" (que abría la
 * pestaña Información). Un gerente o contador sin formación legal necesita
 * que el botón lo lleve EXACTAMENTE a la pantalla donde se arregla el
 * problema: el legajo para subir el documento, la calculadora de CTS para
 * calcular el depósito, el registro del EMO, etc.
 *
 * Este archivo es la única fuente de verdad del destino de cada tipo. Lo usan:
 *   - /dashboard/alertas      → botón "Resolver ahora" de cada tarjeta
 *   - /dashboard/calendario   → enlace de los eventos que vienen de alertas
 *   - /dashboard/plan-accion  → botón "Resolver" de las alertas en Pendientes
 *   - Ficha del trabajador    → tarjeta "Alertas activas" (WorkerAlertsCard),
 *     vía `resolveWorkerAlertActionInProfile`
 *
 * Reglas:
 *   - Funciones puras, sin React ni fetch → fáciles de testear.
 *   - Si un tipo no está mapeado, se cae a la ficha del trabajador (si hay
 *     workerId) y si no, no hay acción: nunca inventamos un destino.
 *   - Los textos de "por qué importa" son deliberadamente conservadores:
 *     explican la consecuencia sin dar asesoría legal específica.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Pestañas del perfil del trabajador (`/dashboard/trabajadores/[id]?tab=`). */
export type WorkerTab =
  | 'info'
  | 'legajo'
  | 'contratos'
  | 'remuneraciones'
  | 'vacaciones'
  | 'sst'
  | 'capacitaciones'
  | 'beneficios'
  | 'historial'

/**
 * Acción que corrige una alerta.
 *  - `link`: navegación interna (Next Link).
 *  - `external`: abre una fuente oficial en otra pestaña (p. ej. El Peruano).
 *  - `assistant`: abre el asistente IA con una pregunta ya escrita.
 */
export type AlertAction =
  | { kind: 'link'; href: string; destination: string }
  | { kind: 'external'; href: string; destination: string }
  | { kind: 'assistant'; prompt: string; destination: string }

/** Alcance de la alerta: de una persona concreta o de toda la empresa. */
export type AlertScope = 'worker' | 'org'

type RouteSpec =
  | { to: 'worker'; tab?: WorkerTab; destination: string }
  | { to: 'page'; href: string; destination: string }

interface AlertTypeConfig {
  /** Nombre del tipo en lenguaje simple (se muestra en la tarjeta). */
  label: string
  /**
   * `org` = la obligación es de la empresa aunque el motor la asocie a un
   * trabajador (p. ej. alertas SST que el cron guarda con un trabajador de
   * referencia). En esos casos no mostramos "Afecta a: <persona>".
   */
  scope: AlertScope
  /** Una línea que explica la consecuencia de no corregirla. */
  whyItMatters?: string
  route: RouteSpec
  /**
   * Pestaña de la ficha a abrir cuando la alerta se ve DENTRO del perfil de
   * ese trabajador y `route` lleva a otra pantalla. Solo se usa cuando esa
   * pestaña ya resuelve el caso para esa persona (p. ej. Beneficios calcula
   * su CTS y su gratificación con sus datos reales, sin volver a tipearlos).
   */
  inProfile?: { tab: WorkerTab; destination: string }
}

// ─── Constantes de rutas ─────────────────────────────────────────────────────

export const ROUTES = {
  trabajadores: '/dashboard/trabajadores',
  alertas: '/dashboard/alertas',
  calculadoraCts: '/dashboard/calculadoras/cts',
  calculadoraGratificacion: '/dashboard/calculadoras/gratificacion',
  calculadoraAportes: '/dashboard/calculadoras/aportes',
  calculadoraUtilidades: '/dashboard/calculadoras/utilidades',
  asistencia: '/dashboard/asistencia',
  sst: '/dashboard/sst',
  sstEmo: '/dashboard/sst/emo',
  sstIperc: '/dashboard/sst/iperc',
  sstAccidentes: '/dashboard/sst/accidentes',
  sstComite: '/dashboard/sst/comite',
  sstComiteElecciones: '/dashboard/sst/comite/elecciones',
  sstPlanAnual: '/dashboard/sst/plan-anual',
} as const

/** Construye la URL del perfil del trabajador, opcionalmente en una pestaña. */
export function workerHref(workerId: string, tab?: WorkerTab): string {
  const base = `${ROUTES.trabajadores}/${encodeURIComponent(workerId)}`
  return tab ? `${base}?tab=${tab}` : base
}

// ─── Mapeo tipo → acción ─────────────────────────────────────────────────────

const LEGAJO_WHY =
  'En una inspección, SUNAFIL revisa el legajo: cada documento obligatorio que falte o esté vencido puede generar multa.'

export const WORKER_ALERT_ACTIONS: Record<string, AlertTypeConfig> = {
  // ── Contratos ──
  CONTRATO_POR_VENCER: {
    label: 'Contrato por vencer',
    scope: 'worker',
    whyItMatters:
      'Si la persona sigue trabajando después del vencimiento sin renovar, el contrato pasa a ser indefinido.',
    route: { to: 'worker', tab: 'contratos', destination: 'Contratos del trabajador' },
  },
  CONTRATO_VENCIDO: {
    label: 'Contrato vencido',
    scope: 'worker',
    whyItMatters:
      'Un contrato a plazo vencido con la persona aún trabajando se considera indefinido y complica un eventual cese.',
    route: { to: 'worker', tab: 'contratos', destination: 'Contratos del trabajador' },
  },
  CAMBIO_REGIMEN_SIN_ADENDA: {
    label: 'Cambio sin adenda',
    scope: 'worker',
    whyItMatters:
      'Todo cambio de régimen o de condiciones debe quedar firmado en una adenda; sin ella, no podrás demostrarlo.',
    route: { to: 'worker', tab: 'contratos', destination: 'Contratos del trabajador' },
  },

  // ── Legajo / documentos ──
  DOCUMENTO_FALTANTE: {
    label: 'Documento faltante',
    scope: 'worker',
    whyItMatters: LEGAJO_WHY,
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  DOCUMENTO_VENCIDO: {
    label: 'Documento vencido',
    scope: 'worker',
    whyItMatters: 'Ante una inspección, un documento vencido vale lo mismo que no tenerlo.',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  DOCUMENTO_SOSPECHOSO: {
    label: 'Documento por revisar',
    scope: 'worker',
    whyItMatters:
      'La revisión automática detectó posibles inconsistencias. Confírmalo antes de darlo por válido.',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  REGISTRO_INCOMPLETO: {
    label: 'Legajo incompleto',
    scope: 'worker',
    whyItMatters: LEGAJO_WHY,
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  SCTR_VENCIDO: {
    label: 'SCTR vencido',
    scope: 'worker',
    whyItMatters:
      'En actividades de riesgo el SCTR es obligatorio; sin póliza vigente, la empresa asume el costo de un accidente.',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  LICENCIA_MEDICA_VENCIDA: {
    label: 'Licencia médica vencida',
    scope: 'worker',
    whyItMatters:
      'Confirma si la persona volvió a trabajar o si tiene un nuevo certificado de incapacidad (CITT).',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  // El motor genera esta alerta cuando falta el examen médico en el legajo:
  // subir el examen actualizado al legajo es lo que la corrige.
  EXAMEN_MEDICO_VENCIDO: {
    label: 'Examen médico',
    scope: 'worker',
    whyItMatters:
      'El examen médico ocupacional es obligatorio por la Ley 29783 y SUNAFIL lo pide en las inspecciones de SST.',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  // El motor la genera cuando falta el registro de inducción SST en el legajo.
  CAPACITACION_PENDIENTE: {
    label: 'Capacitación SST',
    scope: 'worker',
    whyItMatters:
      'La inducción en seguridad y salud es obligatoria antes de que la persona empiece a trabajar (Ley 29783).',
    route: { to: 'worker', tab: 'legajo', destination: 'Legajo del trabajador' },
  },
  T_REGISTRO_NO_PRESENTADO: {
    label: 'T-Registro pendiente',
    scope: 'worker',
    whyItMatters:
      'Todo trabajador debe estar dado de alta en T-Registro (SUNAT). Es de lo primero que se revisa en una inspección.',
    route: { to: 'worker', tab: 'info', destination: 'Ficha del trabajador (T-Registro)' },
  },

  // ── Vacaciones ──
  VACACIONES_ACUMULADAS: {
    label: 'Vacaciones acumuladas',
    scope: 'worker',
    whyItMatters:
      'Si la persona no descansa dentro del año siguiente al que ganó sus vacaciones, la empresa debe pagar una indemnización adicional.',
    route: { to: 'worker', tab: 'vacaciones', destination: 'Vacaciones del trabajador' },
  },
  VACACIONES_DOBLE_PERIODO: {
    label: 'Triple vacacional',
    scope: 'worker',
    whyItMatters:
      'Ya corresponde pagar la indemnización vacacional. Programa el descanso cuanto antes para no seguir acumulando.',
    route: { to: 'worker', tab: 'vacaciones', destination: 'Vacaciones del trabajador' },
  },

  // ── Beneficios de calendario (se calculan por trabajador en la calculadora) ──
  CTS_PENDIENTE: {
    label: 'Depósito de CTS',
    scope: 'worker',
    whyItMatters:
      'La CTS se deposita hasta el 15 de mayo y el 15 de noviembre. Si se deposita tarde, se pagan intereses y hay riesgo de multa.',
    route: { to: 'page', href: ROUTES.calculadoraCts, destination: 'Calculadora de CTS' },
    inProfile: { tab: 'beneficios', destination: 'Beneficios (su CTS ya calculada)' },
  },
  GRATIFICACION_PENDIENTE: {
    label: 'Gratificación',
    scope: 'worker',
    whyItMatters:
      'Las gratificaciones se pagan hasta el 15 de julio y el 15 de diciembre (Ley 27735). Pagarlas tarde genera multa.',
    route: {
      to: 'page',
      href: ROUTES.calculadoraGratificacion,
      destination: 'Calculadora de gratificación',
    },
    inProfile: { tab: 'beneficios', destination: 'Beneficios (su gratificación ya calculada)' },
  },
  AFP_EN_MORA: {
    label: 'Aportes AFP',
    scope: 'worker',
    whyItMatters:
      'Los aportes retenidos al trabajador deben pagarse dentro del plazo; si no, la AFP cobra intereses moratorios.',
    route: { to: 'page', href: ROUTES.calculadoraAportes, destination: 'Calculadora de aportes' },
  },

  // ── Asistencia ──
  TARDANZAS_CRONICAS: {
    label: 'Tardanzas frecuentes',
    scope: 'worker',
    whyItMatters:
      'Antes de aplicar cualquier medida disciplinaria, las tardanzas deben estar registradas y comunicadas.',
    route: { to: 'page', href: ROUTES.asistencia, destination: 'Asistencia' },
  },
  AUSENTISMO_CRONICO: {
    label: 'Faltas frecuentes',
    scope: 'worker',
    whyItMatters:
      'Las faltas sin justificar deben quedar registradas para poder sustentar cualquier medida disciplinaria.',
    route: { to: 'page', href: ROUTES.asistencia, destination: 'Asistencia' },
  },

  // ── SST Premium (generadas por el cron diario SST) ──
  EMO_PROXIMO: {
    label: 'Examen médico por vencer',
    scope: 'worker',
    whyItMatters:
      'El examen médico ocupacional debe renovarse antes de su vencimiento para mantener a la persona apta.',
    route: { to: 'page', href: ROUTES.sstEmo, destination: 'Exámenes médicos (SST)' },
  },
  EMO_VENCIDO: {
    label: 'Examen médico vencido',
    scope: 'worker',
    whyItMatters:
      'El examen médico ocupacional es obligatorio por la Ley 29783 y SUNAFIL lo pide en las inspecciones de SST.',
    route: { to: 'page', href: ROUTES.sstEmo, destination: 'Exámenes médicos (SST)' },
  },
  IPERC_VENCIDO: {
    label: 'Matriz IPERC',
    scope: 'org',
    whyItMatters:
      'La evaluación de riesgos (IPERC) debe actualizarse como mínimo una vez al año (Ley 29783).',
    route: { to: 'page', href: ROUTES.sstIperc, destination: 'Matriz IPERC (SST)' },
  },
  SAT_PLAZO_PROXIMO: {
    label: 'Aviso de accidente',
    scope: 'org',
    whyItMatters:
      'Los accidentes de trabajo deben notificarse al Ministerio de Trabajo dentro del plazo legal; avisar tarde es infracción.',
    route: { to: 'page', href: ROUTES.sstAccidentes, destination: 'Accidentes (SST)' },
  },
  SAT_PLAZO_VENCIDO: {
    label: 'Aviso de accidente',
    scope: 'org',
    whyItMatters:
      'El plazo para notificar el accidente ya venció. Notifícalo cuanto antes y guarda el cargo de presentación.',
    route: { to: 'page', href: ROUTES.sstAccidentes, destination: 'Accidentes (SST)' },
  },
  COMITE_REUNION_PENDIENTE: {
    label: 'Reunión del comité SST',
    scope: 'org',
    whyItMatters:
      'El Comité de SST debe reunirse al menos una vez al mes y dejar constancia en su libro de actas.',
    route: { to: 'page', href: ROUTES.sstComite, destination: 'Comité de SST' },
  },
  COMITE_MANDATO_VENCE: {
    label: 'Mandato del comité SST',
    scope: 'org',
    whyItMatters:
      'Al vencer el mandato hay que elegir a los nuevos representantes de los trabajadores.',
    route: {
      to: 'page',
      href: ROUTES.sstComiteElecciones,
      destination: 'Elecciones del comité SST',
    },
  },
  SIMULACRO_PENDIENTE: {
    label: 'Simulacro de emergencia',
    scope: 'org',
    whyItMatters: 'Los simulacros de emergencia forman parte del plan anual de SST.',
    route: { to: 'page', href: ROUTES.sstPlanAnual, destination: 'Plan anual de SST' },
  },
}

/**
 * Subtipos que el motor de alertas guarda reutilizando otro `type`.
 * Se detectan por el título (es lo único que los distingue en la base).
 */
const SUBTYPE_OVERRIDES: Array<{
  type: string
  titleMatch: RegExp
  config: AlertTypeConfig
}> = [
  {
    // alert-engine reutiliza CTS_PENDIENTE para el pago de utilidades.
    type: 'CTS_PENDIENTE',
    titleMatch: /utilidades/i,
    config: {
      label: 'Pago de utilidades',
      scope: 'worker',
      whyItMatters:
        'Las utilidades se pagan dentro de los 30 días siguientes al plazo de la declaración jurada anual del impuesto a la renta.',
      route: {
        to: 'page',
        href: ROUTES.calculadoraUtilidades,
        destination: 'Calculadora de utilidades',
      },
    },
  },
  {
    // alert-engine reutiliza REGISTRO_INCOMPLETO para sueldos bajo la RMV.
    type: 'REGISTRO_INCOMPLETO',
    titleMatch: /\bRMV\b|m[ií]nima vital/i,
    config: {
      label: 'Sueldo bajo el mínimo',
      scope: 'worker',
      whyItMatters: 'Pagar menos de la remuneración mínima vital es una infracción grave.',
      route: { to: 'worker', tab: 'remuneraciones', destination: 'Remuneraciones del trabajador' },
    },
  },
]

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Nombre de la urgencia en lenguaje simple. Es el mismo en toda la app
 * (Alertas, Pendientes, ficha del trabajador): "Urgente", nunca "Crítica".
 */
export const ALERT_SEVERITY_LABELS: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', string> = {
  CRITICAL: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

/** Etiqueta de urgencia para cualquier valor (desconocido → "Media"). */
export function alertSeverityLabel(severity: string | null | undefined): string {
  const key = (severity ?? '').toUpperCase() as keyof typeof ALERT_SEVERITY_LABELS
  return ALERT_SEVERITY_LABELS[key] ?? ALERT_SEVERITY_LABELS.MEDIUM
}

/**
 * Plazo en palabras a partir de los días que faltan (negativo = ya venció).
 * "Vence en 3 días", "Vence mañana", "Vence hoy", "Venció ayer", "Venció hace 2 días".
 */
export function describeDaysLeft(daysLeft: number | null | undefined): string {
  if (daysLeft === null || daysLeft === undefined || !Number.isFinite(daysLeft)) return 'Sin fecha límite'
  const days = Math.trunc(daysLeft)
  if (days < -1) return `Venció hace ${Math.abs(days)} días`
  if (days === -1) return 'Venció ayer'
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}

export interface WorkerAlertRef {
  type: string
  title?: string | null
  workerId?: string | null
}

/** Devuelve la configuración del tipo (con subtipos resueltos) o `null`. */
export function getWorkerAlertConfig(ref: Pick<WorkerAlertRef, 'type' | 'title'>): AlertTypeConfig | null {
  const title = ref.title ?? ''
  const override = SUBTYPE_OVERRIDES.find((o) => o.type === ref.type && o.titleMatch.test(title))
  if (override) return override.config
  return WORKER_ALERT_ACTIONS[ref.type] ?? null
}

/** Nombre del tipo en lenguaje simple. Fallback: el código sin guiones bajos. */
export function getWorkerAlertLabel(ref: Pick<WorkerAlertRef, 'type' | 'title'>): string {
  const config = getWorkerAlertConfig(ref)
  if (config) return config.label
  const plain = ref.type.replace(/_/g, ' ').toLowerCase()
  return plain.charAt(0).toUpperCase() + plain.slice(1)
}

/**
 * Acción "Resolver ahora" para una alerta de trabajador.
 * - Tipo conocido → su pantalla exacta.
 * - Tipo desconocido con workerId → ficha del trabajador.
 * - Sin datos suficientes → `null` (la UI no muestra el botón).
 */
export function resolveWorkerAlertAction(ref: WorkerAlertRef): AlertAction | null {
  const config = getWorkerAlertConfig(ref)
  const workerId = ref.workerId?.trim() || null

  if (!config) {
    return workerId
      ? { kind: 'link', href: workerHref(workerId), destination: 'Ficha del trabajador' }
      : null
  }

  if (config.route.to === 'page') {
    return { kind: 'link', href: config.route.href, destination: config.route.destination }
  }

  if (!workerId) {
    return { kind: 'link', href: ROUTES.trabajadores, destination: 'Lista de trabajadores' }
  }
  return {
    kind: 'link',
    href: workerHref(workerId, config.route.tab),
    destination: config.route.destination,
  }
}

/**
 * Acción para una alerta que se muestra DENTRO de la ficha de su trabajador.
 *  - `tab`: se resuelve en una pestaña de esa misma ficha → se cambia de
 *    pestaña sin navegar (no se pierde el contexto ni se recarga la página).
 *  - `link`: se resuelve en otra pantalla (calculadora, módulo SST…) → mismo
 *    destino que en Alertas, Calendario y Pendientes.
 *  - `null`: tipo desconocido; su destino genérico es la ficha, donde ya está.
 *
 * Orden: `inProfile` del tipo (p. ej. CTS → Beneficios, que ya calcula el
 * monto de esa persona) → ruta de la ficha → ruta general.
 */
export type InProfileAlertAction =
  | { kind: 'tab'; tab: WorkerTab; destination: string }
  | AlertAction

export function resolveWorkerAlertActionInProfile(
  ref: Pick<WorkerAlertRef, 'type' | 'title'>,
): InProfileAlertAction | null {
  const config = getWorkerAlertConfig(ref)
  if (!config) return null
  if (config.inProfile) {
    return { kind: 'tab', tab: config.inProfile.tab, destination: config.inProfile.destination }
  }
  if (config.route.to === 'worker') {
    return { kind: 'tab', tab: config.route.tab ?? 'info', destination: config.route.destination }
  }
  return { kind: 'link', href: config.route.href, destination: config.route.destination }
}

export interface NormAlertRef {
  title: string
  normCode?: string | null
  sourceUrl?: string | null
}

/** Solo aceptamos URLs http(s) absolutas para abrir en otra pestaña. */
export function isSafeExternalUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/** Pregunta que se envía al asistente para explicar una norma. */
export function buildNormAssistantPrompt(ref: NormAlertRef): string {
  const code = ref.normCode ? ` (${ref.normCode})` : ''
  return `Explícame en palabras simples qué cambia con "${ref.title}"${code} y qué debe hacer mi empresa para cumplir, paso a paso.`
}

/**
 * Acción "Resolver ahora" para una alerta normativa.
 * - Si conocemos la fuente oficial de la norma → se abre en otra pestaña.
 * - Si no → el asistente explica qué cambia y qué hacer.
 */
export function resolveNormAlertAction(ref: NormAlertRef): AlertAction {
  if (isSafeExternalUrl(ref.sourceUrl)) {
    return { kind: 'external', href: ref.sourceUrl, destination: 'Texto oficial de la norma' }
  }
  return {
    kind: 'assistant',
    prompt: buildNormAssistantPrompt(ref),
    destination: 'El asistente te explica qué hacer',
  }
}

/**
 * Las alertas del cron SST guardan una huella técnica al inicio de la
 * descripción (`[sst-fp:XYZ] ...`) para no duplicarse. No debe verse.
 */
export function cleanAlertDescription(description: string | null | undefined): string {
  if (!description) return ''
  return description.replace(/^\s*\[sst-fp:[^\]]*\]\s*/, '').trim()
}
