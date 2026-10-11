/**
 * Régimen laboral en las calculadoras — datos y textos didácticos.
 *
 * Esta capa NO calcula nada: solo describe cómo el motor legal
 * (`src/lib/legal-engine/**`) trata cada régimen, para que la interfaz pueda
 * explicarlo en lenguaje simple y avisar cuando el resultado es referencial.
 *
 * Cómo trata el motor cada régimen (revisado en cts.ts, gratificacion.ts,
 * vacaciones.ts, indemnizacion.ts y liquidacion.ts):
 *  - GENERAL, MYPE_MICRO y MYPE_PEQUENA → reglas propias implementadas.
 *  - TELETRABAJO, MINERO, TEXTIL_EXPORTACION → reglas del régimen general
 *    (que es lo que les corresponde en CTS, gratificación y vacaciones).
 *  - AGRARIO, CONSTRUCCION_CIVIL, PESQUERO, DOMESTICO, CAS,
 *    MODALIDAD_FORMATIVA → el motor aún no tiene sus reglas propias: el
 *    resultado sale con reglas generales (o con un ajuste parcial) y por eso
 *    se muestra como referencial.
 */

import { PERU_LABOR } from '@/lib/legal-engine/peru-labor'

export type RegimenKey =
  | 'GENERAL'
  | 'MYPE_MICRO'
  | 'MYPE_PEQUENA'
  | 'AGRARIO'
  | 'CONSTRUCCION_CIVIL'
  | 'PESQUERO'
  | 'DOMESTICO'
  | 'CAS'
  | 'MODALIDAD_FORMATIVA'
  | 'MINERO'
  | 'TEXTIL_EXPORTACION'
  | 'TELETRABAJO'

/** Calculadoras cuyo resultado cambia según el régimen en el motor. */
export type CalcConRegimen =
  | 'cts'
  | 'gratificacion'
  | 'vacaciones'
  | 'indemnizacion'
  | 'liquidacion'
  | 'costo_empleador'

/**
 * - `soportado`: el motor aplica sus reglas propias.
 * - `como_general`: le corresponden las reglas del régimen general.
 * - `especial`: tiene reglas propias que el motor aún no calcula → referencial.
 */
export type TratamientoRegimen = 'soportado' | 'como_general' | 'especial'

export interface RegimenInfo {
  key: RegimenKey
  label: string
  /** Una línea: qué es este régimen, en simple. */
  descripcion: string
  tratamiento: TratamientoRegimen
  /** Solo para `especial`: por qué el resultado general no aplica tal cual. */
  motivoEspecial?: string
  /** Id del término en el glosario (src/lib/glossary.ts), si existe. */
  glosarioId?: string
}

const MICRO_UIT = PERU_LABOR.MYPE.MICRO.VENTAS_MAX_UIT_ANUALES
const PEQUENA_UIT = PERU_LABOR.MYPE.PEQUENA.VENTAS_MAX_UIT_ANUALES

export const REGIMENES: Record<RegimenKey, RegimenInfo> = {
  GENERAL: {
    key: 'GENERAL',
    label: 'Régimen general',
    descripcion: 'El régimen por defecto. Aplica si tu empresa no está inscrita en el REMYPE.',
    tratamiento: 'soportado',
    glosarioId: 'regimen-general',
  },
  MYPE_MICRO: {
    key: 'MYPE_MICRO',
    label: 'Microempresa (REMYPE)',
    descripcion: `Empresa inscrita en el REMYPE como microempresa: ventas de hasta ${MICRO_UIT} UIT al año.`,
    tratamiento: 'soportado',
    glosarioId: 'regimen-mype',
  },
  MYPE_PEQUENA: {
    key: 'MYPE_PEQUENA',
    label: 'Pequeña empresa (REMYPE)',
    descripcion: `Empresa inscrita en el REMYPE como pequeña empresa: ventas de hasta ${PEQUENA_UIT} UIT al año.`,
    tratamiento: 'soportado',
    glosarioId: 'regimen-mype',
  },
  AGRARIO: {
    key: 'AGRARIO',
    label: 'Agrario',
    descripcion: 'Actividades agrarias y agroindustriales (Ley 31110).',
    tratamiento: 'especial',
    motivoEspecial:
      'En el régimen agrario la CTS y la gratificación pueden pagarse dentro del jornal diario.',
    glosarioId: 'regimen-agrario',
  },
  CONSTRUCCION_CIVIL: {
    key: 'CONSTRUCCION_CIVIL',
    label: 'Construcción civil',
    descripcion: 'Obreros de obras de construcción, con jornales fijados por convenio.',
    tratamiento: 'especial',
    motivoEspecial:
      'En construcción civil los beneficios se pagan como porcentajes de los jornales, según el convenio colectivo.',
    glosarioId: 'construccion-civil',
  },
  PESQUERO: {
    key: 'PESQUERO',
    label: 'Pesquero',
    descripcion: 'Pescadores y tripulantes de embarcaciones.',
    tratamiento: 'especial',
    motivoEspecial: 'Los pescadores tienen un fondo propio de CTS y reglas de pago distintas.',
  },
  DOMESTICO: {
    key: 'DOMESTICO',
    label: 'Trabajo del hogar',
    descripcion: 'Trabajadoras y trabajadores del hogar (Ley 31047).',
    tratamiento: 'especial',
    motivoEspecial: 'El trabajo del hogar tiene su propia ley (Ley 31047) con reglas particulares.',
  },
  CAS: {
    key: 'CAS',
    label: 'CAS (sector público)',
    descripcion: 'Contratos administrativos de servicios del Estado.',
    tratamiento: 'especial',
    motivoEspecial: 'Los contratos CAS del Estado tienen reglas propias de beneficios.',
  },
  MODALIDAD_FORMATIVA: {
    key: 'MODALIDAD_FORMATIVA',
    label: 'Modalidad formativa',
    descripcion: 'Practicantes y aprendices: reciben subvención, no sueldo.',
    tratamiento: 'especial',
    motivoEspecial:
      'Los practicantes reciben subvención y media subvención cada seis meses, no CTS ni gratificación.',
  },
  MINERO: {
    key: 'MINERO',
    label: 'Minero',
    descripcion: 'Trabajadores de la actividad minera.',
    tratamiento: 'como_general',
  },
  TEXTIL_EXPORTACION: {
    key: 'TEXTIL_EXPORTACION',
    label: 'Textil de exportación',
    descripcion: 'Empresas industriales de exportación no tradicional.',
    tratamiento: 'como_general',
  },
  TELETRABAJO: {
    key: 'TELETRABAJO',
    label: 'Teletrabajo',
    descripcion: 'Trabajo remoto; mantiene los beneficios del régimen general.',
    tratamiento: 'como_general',
  },
}

/** Los tres regímenes que se muestran como tarjetas principales. */
export const REGIMENES_PRINCIPALES: RegimenKey[] = ['GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA']

/** El resto, agrupado en "Otro régimen". */
export const REGIMENES_OTROS: RegimenKey[] = [
  'AGRARIO',
  'CONSTRUCCION_CIVIL',
  'PESQUERO',
  'DOMESTICO',
  'MODALIDAD_FORMATIVA',
  'CAS',
  'MINERO',
  'TEXTIL_EXPORTACION',
  'TELETRABAJO',
]

export const AVISO_REFERENCIAL =
  'Este régimen tiene reglas propias; el resultado es referencial, consúltalo con tu asesor.'

/** Normaliza cualquier string (ej. el régimen de la ficha del trabajador). */
export function normalizarRegimen(value: string | null | undefined): RegimenKey {
  if (value && value in REGIMENES) return value as RegimenKey
  return 'GENERAL'
}

export function getRegimenInfo(value: string | null | undefined): RegimenInfo {
  return REGIMENES[normalizarRegimen(value)]
}

export function esRegimenEspecial(value: string | null | undefined): boolean {
  return getRegimenInfo(value).tratamiento === 'especial'
}

/**
 * "Qué cambia" con este régimen para la calculadora elegida, en una o dos
 * frases simples. Para los regímenes especiales devuelve null: en ese caso se
 * muestra el aviso referencial.
 */
export function notaRegimen(calc: CalcConRegimen, value: string | null | undefined): string | null {
  const info = getRegimenInfo(value)
  if (info.tratamiento === 'especial') return null
  const key = info.tratamiento === 'como_general' ? 'GENERAL' : info.key
  const prefijo = info.tratamiento === 'como_general'
    ? `${info.label}: se aplican las reglas del régimen general. `
    : ''
  const nota = NOTAS[calc][key as 'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA']
  return `${prefijo}${nota}`
}

const MICRO_TOPE = PERU_LABOR.MYPE.MICRO.INDEMNIZACION_TOPE_DIARIO
const MICRO_DIARIO = PERU_LABOR.MYPE.MICRO.INDEMNIZACION_FACTOR_DIARIO
const PEQ_TOPE = PERU_LABOR.MYPE.PEQUENA.INDEMNIZACION_TOPE_DIARIO
const PEQ_DIARIO = PERU_LABOR.MYPE.PEQUENA.INDEMNIZACION_FACTOR_DIARIO

const NOTAS: Record<CalcConRegimen, Record<'GENERAL' | 'MYPE_MICRO' | 'MYPE_PEQUENA', string>> = {
  cts: {
    GENERAL:
      'Corresponde medio sueldo por cada semestre completo (más 1/6 de la gratificación). Se deposita en mayo y noviembre.',
    MYPE_MICRO: 'En la microempresa no corresponde CTS: el monto es cero.',
    MYPE_PEQUENA:
      'En la pequeña empresa la CTS es la mitad que en el régimen general (15 remuneraciones diarias por año).',
  },
  gratificacion: {
    GENERAL:
      'Corresponde un sueldo completo en julio y otro en diciembre, más una bonificación del 9%.',
    MYPE_MICRO: 'En la microempresa no corresponde gratificación: el monto es cero.',
    MYPE_PEQUENA:
      'En la pequeña empresa la gratificación es medio sueldo en julio y medio sueldo en diciembre.',
  },
  vacaciones: {
    GENERAL: 'Corresponden 30 días de vacaciones pagadas por cada año completo de trabajo.',
    MYPE_MICRO: 'En la microempresa corresponden 15 días de vacaciones por año (la mitad del régimen general).',
    MYPE_PEQUENA: 'En la pequeña empresa corresponden 15 días de vacaciones por año (la mitad del régimen general).',
  },
  indemnizacion: {
    GENERAL:
      'Por despido sin causa justa corresponde 1.5 sueldos por cada año trabajado, con un máximo de 12 sueldos.',
    MYPE_MICRO:
      `En la microempresa la indemnización es de ${MICRO_DIARIO} remuneraciones diarias por año trabajado, con un máximo de ${MICRO_TOPE}.`,
    MYPE_PEQUENA:
      `En la pequeña empresa la indemnización es de ${PEQ_DIARIO} remuneraciones diarias por año trabajado, con un máximo de ${PEQ_TOPE}.`,
  },
  liquidacion: {
    GENERAL: 'Incluye CTS, gratificación y vacaciones completas del régimen general.',
    MYPE_MICRO:
      'Microempresa: sin CTS ni gratificación, vacaciones de 15 días por año e indemnización reducida.',
    MYPE_PEQUENA:
      'Pequeña empresa: CTS y gratificación a la mitad, vacaciones de 15 días por año e indemnización reducida.',
  },
  costo_empleador: {
    GENERAL: 'Incluye EsSalud, CTS, dos gratificaciones con su bonificación y 30 días de vacaciones por año.',
    MYPE_MICRO: 'Microempresa: sin CTS ni gratificaciones y con 15 días de vacaciones por año, así que el costo es menor.',
    MYPE_PEQUENA: 'Pequeña empresa: CTS y gratificaciones a la mitad y 15 días de vacaciones por año.',
  },
}
