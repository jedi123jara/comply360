/**
 * Catálogo de comités/comisiones y designaciones OBLIGATORIOS por la ley
 * peruana — fuente única de verdad para el organigrama.
 *
 * Cada obligación sabe:
 *  - su base legal,
 *  - bajo qué condición es obligatoria/recomendada (según nº de trabajadores,
 *    composición por género, tratamiento de datos personales, etc.),
 *  - qué plantilla de `ORG_TEMPLATES` la instancia (unidad + cargos), y
 *  - su severidad (para mapear la exposición a multa SUNAFIL).
 *
 * Es un módulo PURO (sin Prisma): recibe un `ComiteContext` y devuelve la
 * evaluación. La UI/servidor arma el contexto; este archivo solo decide.
 *
 * Umbrales confirmados con el fundador (2026-06-21):
 *  - SST: Comité paritario ≥20 trab. / Supervisor <20 (Ley 29783).
 *  - Hostigamiento: CIHSO ≥20 / Gestor designado <20 (Ley 27942).
 *  - Cuadro de categorías Ley 30709: todas (es documento, no comité).
 *  - Lactario: ≥20 mujeres en edad fértil (Ley 29896).
 *  - Asistenta social: ≥100 mujeres (D.S. 009-2016-MIMP / D.Leg. 728).
 *  - DPO: si la empresa trata datos personales (Ley 29733).
 *  - Brigadas de emergencia: parte del plan SST.
 */

/** Grado de exigencia de una obligación dado el contexto de la empresa. */
export type ComiteApplicability = 'obligatorio' | 'recomendado' | 'condicional' | 'no-aplica'

/** Naturaleza de la obligación. */
export type ComiteKind =
  | 'comite' // órgano colegiado con miembros (SST, hostigamiento, brigada)
  | 'responsable' // designación de una persona (DPO, asistenta social, lactario)
  | 'documento' // entregable sin miembros (cuadro de categorías)

export type ComiteSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

/** Datos de la empresa necesarios para evaluar las obligaciones. */
export interface ComiteContext {
  /** Total de trabajadores activos. */
  workerCount: number
  /** Nº de mujeres (para asistenta social). `undefined` si no se conoce. */
  womenCount?: number
  /** Nº de mujeres en edad fértil ~15-49 (para lactario). `undefined` si no se conoce. */
  womenFertileCount?: number
  /** ¿La empresa trata datos personales en banco de datos? (para DPO). */
  processesPersonalData?: boolean
}

export interface ComiteObligacion {
  id: string
  /** Nombre cuando aplica la forma plena (ej. "Comité de SST"). */
  name: string
  /** Nombre corto para chips/tarjetas. */
  shortName: string
  kind: ComiteKind
  legalBasis: string
  /** Resumen legible de la condición de obligatoriedad. */
  triggerLabel: string
  severity: ComiteSeverity
  /**
   * Resuelve la obligación contra el contexto: devuelve la exigencia, el título
   * concreto (el SST puede ser "Comité" o "Supervisor"), la plantilla a aplicar
   * y un detalle legible.
   */
  resolve: (ctx: ComiteContext) => {
    applicability: ComiteApplicability
    resolvedTitle: string
    /** Plantilla de ORG_TEMPLATES a instanciar; null si es documento o no aplica. */
    templateId: string | null
    detail: string
  }
}

export interface ComiteResolved {
  obligacion: ComiteObligacion
  applicability: ComiteApplicability
  resolvedTitle: string
  templateId: string | null
  detail: string
}

const UMBRAL_PARITARIO = 20

/**
 * El catálogo. El orden es el de prioridad de cumplimiento (lo más universal y
 * grave primero).
 */
export const COMITES_OBLIGATORIOS: ComiteObligacion[] = [
  {
    id: 'sst',
    name: 'Comité de Seguridad y Salud en el Trabajo',
    shortName: 'SST',
    kind: 'comite',
    legalBasis: 'Ley 29783 (Art. 29-30); D.S. 005-2012-TR; R.M. 245-2021-TR',
    triggerLabel: '≥20 trabajadores → Comité paritario · <20 → Supervisor',
    severity: 'CRITICAL',
    resolve: (ctx) => {
      if (ctx.workerCount >= UMBRAL_PARITARIO) {
        return {
          applicability: 'obligatorio',
          resolvedTitle: 'Comité de SST (paritario)',
          templateId: 'comite-sst-paritario',
          detail: `Con ${ctx.workerCount} trabajadores corresponde un Comité paritario (igual número de representantes del empleador y de los trabajadores). Mandato 2 años.`,
        }
      }
      return {
        applicability: 'obligatorio',
        resolvedTitle: 'Supervisor de SST',
        templateId: 'supervisor-sst',
        detail: `Con menos de 20 trabajadores corresponde designar un Supervisor de SST elegido por los trabajadores (no Comité).`,
      }
    },
  },
  {
    id: 'hostigamiento',
    name: 'Comité de Intervención contra el Hostigamiento Sexual',
    shortName: 'Hostigamiento (CIHSO)',
    kind: 'comite',
    legalBasis: 'Ley 27942; D.S. 014-2019-MIMP (Art. 19-25)',
    triggerLabel: 'Todas las empresas · ≥20 → CIHSO paritario · <20 → Gestor designado',
    severity: 'HIGH',
    resolve: (ctx) => {
      if (ctx.workerCount >= UMBRAL_PARITARIO) {
        return {
          applicability: 'obligatorio',
          resolvedTitle: 'Comité de Intervención (CIHSO)',
          templateId: 'comite-hostigamiento-sexual',
          detail: `Con ${ctx.workerCount} trabajadores corresponde el Comité de Intervención frente al Hostigamiento Sexual (CIHSO), paritario: titulares y suplentes del empleador y de los trabajadores.`,
        }
      }
      return {
        applicability: 'obligatorio',
        resolvedTitle: 'Gestor de Intervención (hostigamiento)',
        templateId: 'comite-hostigamiento-sexual',
        detail: `Con menos de 20 trabajadores se designa un Gestor de Intervención (responsable único) en lugar del Comité, con las mismas funciones (recepción de denuncias, medidas de protección, investigación).`,
      }
    },
  },
  {
    id: 'cuadro-categorias',
    name: 'Cuadro de Categorías y Funciones (igualdad salarial)',
    shortName: 'Cuadro Ley 30709',
    kind: 'documento',
    legalBasis: 'Ley 30709; D.S. 002-2018-TR; R.M. 243-2018-TR',
    triggerLabel: 'Todas las empresas (documento aprobado por la gerencia)',
    severity: 'HIGH',
    resolve: () => ({
      applicability: 'obligatorio',
      resolvedTitle: 'Cuadro de Categorías y Funciones',
      templateId: null,
      detail:
        'No es un comité: es un documento que clasifica los puestos en categorías y evita la discriminación salarial. Se gestiona desde el generador de Cuadro de Categorías, no desde el organigrama.',
    }),
  },
  {
    id: 'brigada-emergencia',
    name: 'Brigada de Emergencia',
    shortName: 'Brigada',
    kind: 'comite',
    legalBasis: 'Ley 29783; D.S. 005-2012-TR (plan de respuesta a emergencias)',
    triggerLabel: 'Parte del plan SST (obligatoria de facto con ≥20 trabajadores)',
    severity: 'MEDIUM',
    resolve: (ctx) => ({
      applicability: ctx.workerCount >= UMBRAL_PARITARIO ? 'obligatorio' : 'recomendado',
      resolvedTitle: 'Brigada de Emergencia',
      templateId: 'brigada-emergencia',
      detail:
        'Brigadas de evacuación, primeros auxilios y amago de incendio. Forman parte del plan de respuesta ante emergencias del Sistema de Gestión de SST.',
    }),
  },
  {
    id: 'lactario',
    name: 'Lactario institucional',
    shortName: 'Lactario',
    kind: 'responsable',
    legalBasis: 'Ley 29896; D.S. 001-2016-MIMP',
    triggerLabel: '≥20 mujeres en edad fértil',
    severity: 'MEDIUM',
    resolve: (ctx) => {
      if (ctx.womenFertileCount == null) {
        return {
          applicability: 'condicional',
          resolvedTitle: 'Lactario institucional',
          templateId: 'lactario-institucional',
          detail:
            'Obligatorio si la empresa tiene ≥20 mujeres en edad fértil. Confirma el número de trabajadoras en edad fértil para saber si aplica.',
        }
      }
      return {
        applicability: ctx.womenFertileCount >= 20 ? 'obligatorio' : 'no-aplica',
        resolvedTitle: 'Lactario institucional',
        templateId: 'lactario-institucional',
        detail:
          ctx.womenFertileCount >= 20
            ? `Con ${ctx.womenFertileCount} mujeres en edad fértil corresponde implementar un lactario y designar un responsable.`
            : `Con ${ctx.womenFertileCount} mujeres en edad fértil aún no se alcanza el umbral de 20.`,
      }
    },
  },
  {
    id: 'asistenta-social',
    name: 'Servicio de Asistenta Social',
    shortName: 'Asistenta social',
    kind: 'responsable',
    legalBasis: 'D.Leg. 728 / normativa sectorial (servicio de bienestar social)',
    triggerLabel: '≥100 mujeres',
    severity: 'MEDIUM',
    resolve: (ctx) => {
      if (ctx.womenCount == null) {
        return {
          applicability: 'condicional',
          resolvedTitle: 'Asistenta Social',
          templateId: 'asistenta-social',
          detail:
            'Obligatorio designar una asistenta social si la empresa tiene ≥100 mujeres. Confirma el número de trabajadoras para saber si aplica.',
        }
      }
      return {
        applicability: ctx.womenCount >= 100 ? 'obligatorio' : 'no-aplica',
        resolvedTitle: 'Asistenta Social',
        templateId: 'asistenta-social',
        detail:
          ctx.womenCount >= 100
            ? `Con ${ctx.womenCount} mujeres corresponde designar una asistenta social.`
            : `Con ${ctx.womenCount} mujeres aún no se alcanza el umbral de 100.`,
      }
    },
  },
  {
    id: 'dpo',
    name: 'Oficial de Protección de Datos Personales (DPO)',
    shortName: 'DPO',
    kind: 'responsable',
    legalBasis: 'Ley 29733; D.S. 016-2024-JUS',
    triggerLabel: 'Si la empresa trata datos personales en banco de datos',
    severity: 'MEDIUM',
    resolve: (ctx) => {
      if (ctx.processesPersonalData == null) {
        return {
          applicability: 'condicional',
          resolvedTitle: 'Oficial de Protección de Datos (DPO)',
          templateId: 'responsable-datos-personales',
          detail:
            'Recomendado/obligatorio designar un responsable de protección de datos si la empresa trata datos personales (planillas, clientes, postulantes). Confirma si tratas datos personales.',
        }
      }
      return {
        applicability: ctx.processesPersonalData ? 'recomendado' : 'no-aplica',
        resolvedTitle: 'Oficial de Protección de Datos (DPO)',
        templateId: 'responsable-datos-personales',
        detail: ctx.processesPersonalData
          ? 'Como la empresa trata datos personales, conviene designar un responsable (DPO) que vele por el cumplimiento de la Ley 29733.'
          : 'No aplica si la empresa no trata datos personales en banco de datos.',
      }
    },
  },
]

/** Evalúa todas las obligaciones del catálogo contra el contexto de la empresa. */
export function evaluarComitesObligatorios(ctx: ComiteContext): ComiteResolved[] {
  return COMITES_OBLIGATORIOS.map((obligacion) => {
    const r = obligacion.resolve(ctx)
    return {
      obligacion,
      applicability: r.applicability,
      resolvedTitle: r.resolvedTitle,
      templateId: r.templateId,
      detail: r.detail,
    }
  })
}

/** Orden de exigencia para ordenar/priorizar tarjetas. */
export const APPLICABILITY_ORDER: Record<ComiteApplicability, number> = {
  obligatorio: 0,
  recomendado: 1,
  condicional: 2,
  'no-aplica': 3,
}

/** Etiqueta legible de la exigencia. */
export const APPLICABILITY_LABEL: Record<ComiteApplicability, string> = {
  obligatorio: 'Obligatorio',
  recomendado: 'Recomendado',
  condicional: 'Según tu caso',
  'no-aplica': 'No aplica',
}

/**
 * Palabras clave para detectar si una unidad ya existente del organigrama cubre
 * una obligación (match por nombre de la unidad). `null` = no vive en el
 * organigrama (ej. el cuadro de categorías es un documento).
 */
const MATCHERS: Record<string, RegExp | null> = {
  sst: /seguridad y salud|\bsst\b/i,
  hostigamiento: /hostigamiento|cihso/i,
  'cuadro-categorias': null,
  'brigada-emergencia': /brigada/i,
  lactario: /lactario/i,
  'asistenta-social': /asistenta social|servicio social|bienestar social/i,
  dpo: /protecci[oó]n de datos|datos personales|\bdpo\b/i,
}

/** ¿Alguna de las unidades dadas (por nombre) cubre esta obligación? */
export function obligacionCubierta(obligacionId: string, unitNames: string[]): boolean {
  const re = MATCHERS[obligacionId]
  if (!re) return false
  return unitNames.some((name) => re.test(name))
}
