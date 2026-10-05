/**
 * Ruta de arranque del panel: los 5 primeros pasos de una empresa nueva.
 *
 * Todo se calcula con datos reales del servidor (nunca con localStorage). El
 * navegador solo guarda qué pasos ya se celebraron, para felicitar una sola
 * vez cuando un paso pasa de pendiente a hecho.
 *
 * Funciones puras: se prueban sin navegador ni base de datos.
 */

import type { StartRouteProgress } from '@/lib/cockpit/data'
import { formatSolesRedondeado } from './cockpit-format'

export type StartStepKey = 'empresa' | 'trabajadores' | 'diagnostico' | 'pendiente' | 'legajo'

// El diagnóstico va antes que los trabajadores: no necesita datos cargados y es lo
// que antes le dice al cliente cuánto arriesga (igual que la cabecera del panel).
export const START_STEP_ORDER: readonly StartStepKey[] = [
  'empresa',
  'diagnostico',
  'trabajadores',
  'pendiente',
  'legajo',
]

export interface StartRouteInput {
  progress: StartRouteProgress
  totalWorkers: number
  /** Puntaje del último diagnóstico, o null si nunca se hizo. */
  diagnosticScore: number | null
  hasDiagnostic: boolean
  /** Tareas abiertas del plan de acción. */
  openTasks: number
  /** Ruta de la acción más urgente de hoy (si existe), para ir directo a resolverla. */
  focusHref: string | null
}

export interface StartStep {
  key: StartStepKey
  /** 1 a 5. */
  number: number
  title: string
  /** Por qué importa, en una frase. */
  why: string
  done: boolean
  /** Estado con dato real ("3 trabajadores registrados", "Falta: RUC y sector"). */
  detail: string | null
  /**
   * Si el paso todavía no se puede hacer, qué hay que hacer antes. Un paso
   * bloqueado no muestra botón ni se propone como siguiente.
   */
  blockedBy: string | null
  href: string
  cta: string
  secondary: { href: string; label: string } | null
}

export interface StartRoute {
  steps: StartStep[]
  doneCount: number
  total: number
  complete: boolean
  /** El primer paso pendiente que ya se puede hacer. */
  nextStep: StartStep | null
}

const DIAGNOSTICO_HREF = '/dashboard/diagnostico'
const PENDIENTES_HREF = '/dashboard/plan-accion'

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm
}

/** "RUC", "RUC y sector", "RUC, sector y régimen laboral". */
export function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

export function buildStartRoute(input: StartRouteInput): StartRoute {
  const { progress, totalWorkers, diagnosticScore, hasDiagnostic, openTasks, focusHref } = input
  const resolved = progress.resolvedTasks + progress.resolvedAlerts
  const openPendientes = openTasks + progress.openAlerts
  const legajoWorker = progress.legajoWorker

  const empresaDone = progress.orgMissingFields.length === 0
  const trabajadoresDone = totalWorkers > 0
  const pendienteDone = resolved > 0
  const legajoDone = progress.legajoDocs > 0

  const unordered: StartStep[] = [
    {
      key: 'empresa',
      number: 1,
      title: 'Datos de tu empresa',
      why: 'Con tu RUC, sector y régimen laboral sabemos qué normas te aplican y cuánto te podrían multar.',
      done: empresaDone,
      detail: empresaDone
        ? 'RUC, sector y régimen laboral completos.'
        : `Falta: ${joinSpanish(progress.orgMissingFields)}.`,
      blockedBy: null,
      href: '/dashboard/configuracion/empresa',
      cta: 'Completar datos',
      secondary: null,
    },
    {
      key: 'trabajadores',
      number: 2,
      title: 'Registra a tus trabajadores',
      why: 'Así vigilamos por ti sus contratos, vacaciones, CTS y fechas de vencimiento.',
      done: trabajadoresDone,
      detail: trabajadoresDone
        ? `${totalWorkers} ${plural(totalWorkers, 'trabajador registrado', 'trabajadores registrados')}.`
        : null,
      blockedBy: null,
      href: '/dashboard/trabajadores/nuevo',
      cta: 'Registrar trabajador',
      secondary: trabajadoresDone
        ? null
        : { href: '/dashboard/trabajadores?import=excel', label: 'O importa tu planilla desde Excel' },
    },
    {
      key: 'diagnostico',
      number: 3,
      title: 'Haz el diagnóstico',
      why: 'Son preguntas de sí o no. Al terminar sabrás cuánto te pueden multar y qué corregir primero.',
      done: hasDiagnostic,
      detail: hasDiagnostic
        ? diagnosticScore !== null
          ? `Tu nivel de cumplimiento salió ${Math.round(diagnosticScore)} de 100.`
          : 'Diagnóstico completado.'
        : null,
      blockedBy: null,
      href: DIAGNOSTICO_HREF,
      cta: 'Hacer el diagnóstico',
      secondary: null,
    },
    {
      key: 'pendiente',
      number: 4,
      title: 'Resuelve tu primer pendiente',
      why: 'Cada pendiente que resuelves baja lo que te podrían multar en una inspección de SUNAFIL.',
      done: pendienteDone,
      detail: pendienteDone
        ? progress.multaReducida > 0
          ? `${resolved} ${plural(resolved, 'pendiente resuelto', 'pendientes resueltos')}: bajaste tu exposición en ${formatSolesRedondeado(progress.multaReducida)}.`
          : `${resolved} ${plural(resolved, 'pendiente resuelto', 'pendientes resueltos')}.`
        : openPendientes > 0
          ? `Tienes ${openPendientes} ${plural(openPendientes, 'pendiente', 'pendientes')} por resolver.`
          : null,
      // Los pendientes nacen del diagnóstico o de las alertas de tus trabajadores.
      blockedBy:
        !pendienteDone && openPendientes === 0
          ? hasDiagnostic || trabajadoresDone
            ? 'Por ahora no tienes pendientes abiertos.'
            : 'Aparecen cuando haces el diagnóstico o registras a tus trabajadores.'
          : null,
      href: !pendienteDone && focusHref ? focusHref : PENDIENTES_HREF,
      cta: !pendienteDone && focusHref ? 'Resolver el más urgente' : 'Ver mis pendientes',
      secondary: null,
    },
    {
      key: 'legajo',
      number: 5,
      title: 'Sube los documentos del legajo de un trabajador',
      why: 'Es lo primero que pide un inspector: contrato, DNI, boletas y exámenes médicos de cada trabajador.',
      done: legajoDone,
      detail: legajoDone
        ? legajoWorker && legajoWorker.legajoScore > 0
          ? `${progress.legajoDocs} ${plural(progress.legajoDocs, 'documento subido', 'documentos subidos')}. El legajo de ${legajoWorker.name} va en ${legajoWorker.legajoScore}%.`
          : `${progress.legajoDocs} ${plural(progress.legajoDocs, 'documento subido', 'documentos subidos')}.`
        : null,
      blockedBy: !legajoDone && !trabajadoresDone ? 'Primero registra a un trabajador.' : null,
      href: legajoWorker ? `/dashboard/trabajadores/${legajoWorker.id}?tab=legajo` : '/dashboard/trabajadores',
      cta: 'Subir documentos',
      secondary: null,
    },
  ]

  const steps = START_STEP_ORDER.map((key, index) => ({
    ...unordered.find((step) => step.key === key)!,
    number: index + 1,
  }))

  const doneCount = steps.filter((step) => step.done).length
  return {
    steps,
    doneCount,
    total: steps.length,
    complete: doneCount === steps.length,
    nextStep: steps.find((step) => !step.done && !step.blockedBy) ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Celebración: una sola vez por paso
// ─────────────────────────────────────────────────────────────────────────────

/** Lee la marca guardada ("ya celebré") sin confiar en su contenido. */
export function parseCelebrated(raw: string | null): Set<StartStepKey> | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.filter((value): value is StartStepKey =>
        typeof value === 'string' && (START_STEP_ORDER as readonly string[]).includes(value),
      ),
    )
  } catch {
    return new Set()
  }
}

export function serializeCelebrated(keys: Iterable<StartStepKey>): string {
  const set = new Set(keys)
  return JSON.stringify(START_STEP_ORDER.filter((key) => set.has(key)))
}

/**
 * Pasos hechos que todavía no se celebraron. Sin marca previa (primera vez que
 * este navegador ve el panel) no celebramos nada: no sabemos si el paso se
 * acaba de completar o ya estaba hecho, y felicitar de más no sería honesto.
 */
export function newlyCompletedSteps(
  route: StartRoute,
  celebrated: ReadonlySet<StartStepKey> | null,
): StartStepKey[] {
  if (celebrated === null) return []
  return route.steps.filter((step) => step.done && !celebrated.has(step.key)).map((step) => step.key)
}

export function doneStepKeys(route: StartRoute): StartStepKey[] {
  return route.steps.filter((step) => step.done).map((step) => step.key)
}

export interface Celebration {
  keys: StartStepKey[]
  title: string
  detail: string | null
}

/** Cómo nombrar un paso ya hecho dentro de una frase ("También completaste: …"). */
const DONE_LABEL: Record<StartStepKey, string> = {
  empresa: 'los datos de tu empresa',
  trabajadores: 'el registro de tus trabajadores',
  diagnostico: 'el diagnóstico',
  pendiente: 'tu primer pendiente',
  legajo: 'el legajo de un trabajador',
}

function celebrationFor(key: StartStepKey, input: StartRouteInput): { title: string; detail: string | null } {
  const { progress } = input
  switch (key) {
    case 'empresa':
      return {
        title: 'Completaste los datos de tu empresa',
        detail: 'Ahora revisamos tus obligaciones con las reglas de tu régimen laboral.',
      }
    case 'trabajadores':
      return {
        title:
          input.totalWorkers === 1
            ? 'Registraste a tu primer trabajador'
            : `Registraste a tus primeros ${input.totalWorkers} trabajadores`,
        detail: 'Desde hoy vigilamos sus contratos, vacaciones y vencimientos.',
      }
    case 'diagnostico':
      return {
        title: 'Hiciste tu diagnóstico',
        detail:
          input.diagnosticScore !== null
            ? `Tu nivel de cumplimiento es ${Math.round(input.diagnosticScore)} de 100. Ya sabes qué corregir primero.`
            : 'Ya sabes qué corregir primero.',
      }
    case 'pendiente': {
      const resolved = progress.resolvedTasks + progress.resolvedAlerts
      return {
        title:
          resolved === 1
            ? 'Resolviste tu primer pendiente'
            : `Resolviste tus primeros ${resolved} pendientes`,
        detail:
          progress.multaReducida > 0
            ? `Bajaste tu exposición a multas en ${formatSolesRedondeado(progress.multaReducida)}.`
            : 'Cada pendiente resuelto te deja mejor preparado ante una inspección.',
      }
    }
    case 'legajo': {
      const worker = progress.legajoWorker
      return {
        title:
          progress.legajoDocs === 1
            ? 'Subiste el primer documento a un legajo'
            : `Subiste ${progress.legajoDocs} documentos a los legajos`,
        detail:
          worker && worker.legajoScore > 0
            ? `El legajo de ${worker.name} ya va en ${worker.legajoScore}%.`
            : null,
      }
    }
  }
}

/**
 * Mensaje para los pasos recién completados. Si son varios, se celebra el más
 * avanzado y se nombran los demás (un solo mensaje, no una ráfaga).
 */
export function buildCelebration(
  keys: StartStepKey[],
  route: StartRoute,
  input: StartRouteInput,
): Celebration | null {
  const ordered = START_STEP_ORDER.filter((key) => keys.includes(key))
  if (ordered.length === 0) return null
  const main = ordered[ordered.length - 1]
  const base = celebrationFor(main, input)
  const others = ordered
    .slice(0, -1)
    .filter((key) => route.steps.some((step) => step.key === key && step.done))
    .map((key) => DONE_LABEL[key])

  const extras: string[] = []
  if (base.detail) extras.push(base.detail)
  if (others.length > 0) extras.push(`También completaste: ${joinSpanish(others)}.`)

  return { keys: ordered, title: base.title, detail: extras.length > 0 ? extras.join(' ') : null }
}

/** Claves de almacenamiento por empresa (un navegador puede ver varias). */
export function startRouteStorageKeys(orgId: string) {
  return {
    celebrated: `comply360.startRoute.celebrated.${orgId}`,
    hidden: `comply360.startRoute.hidden.${orgId}`,
  }
}
