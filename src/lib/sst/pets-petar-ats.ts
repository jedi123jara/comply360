/**
 * Generadores PETS / PETAR / ATS — documentos SST operacionales clave.
 *
 * PETS = Procedimiento Escrito de Trabajo Seguro
 *   Documento permanente que describe paso-a-paso CÓMO ejecutar una tarea
 *   recurrente de forma segura. Se redacta una vez y se usa N veces.
 *   Base legal: Art. 32 del D.S. 005-2012-TR (Reglamento Ley 29783).
 *
 * PETAR = Permiso Escrito para Trabajos de Alto Riesgo
 *   Autorización ESPECÍFICA para una tarea de alto riesgo (alturas, espacios
 *   confinados, calientes, energía eléctrica, izaje, etc.). Se firma ANTES
 *   de iniciar la tarea concreta y caduca al cierre del trabajo.
 *   Base legal: D.S. 024-2016-EM (sectores extractivos), R.M. 050-2013-TR.
 *
 * ATS = Análisis de Trabajo Seguro
 *   Análisis ágil hecho por el equipo ejecutor ANTES de comenzar el día/turno.
 *   Lista los pasos, peligros y controles para esa jornada concreta.
 *   Base legal: Art. 21 Ley 29783, R.M. 050-2013-TR.
 *
 * Las funciones aquí son PURAS: producen estructuras de documento listas para
 * el renderizador PDF. Son testeables sin DB.
 */

export type DocType = 'PETS' | 'PETAR' | 'ATS'

// ── PETS ───────────────────────────────────────────────────────────────────

export interface PetsInput {
  /** Nombre del PETS — ej: "Operación de montacargas" */
  titulo: string
  /** Versión del documento (default: 1) */
  version: number
  /** Objetivo del procedimiento */
  objetivo: string
  /** Alcance — quiénes y dónde aplica */
  alcance: string
  /** Responsables del cumplimiento */
  responsables: string[]
  /** Equipos / herramientas requeridos */
  equipos: string[]
  /** EPP obligatorio */
  epp: string[]
  /** Pasos del procedimiento, en orden */
  pasos: Array<{
    numero: number
    descripcion: string
    /** Peligros que pueden manifestarse en este paso */
    peligros?: string[]
    /** Controles aplicables (jerárquicos) */
    controles?: string[]
  }>
  /** Acciones ante emergencias */
  emergencias: string[]
  /** Referencias / normas aplicables */
  referenciasLegales: string[]
  /** Fecha de elaboración (default: now) */
  fechaElaboracion?: Date
  /** Próxima revisión sugerida (default: 1 año) */
  proximaRevision?: Date
}

// ── PETAR ──────────────────────────────────────────────────────────────────

export type TipoTrabajoAltoRiesgo =
  | 'TRABAJO_EN_ALTURAS'
  | 'ESPACIO_CONFINADO'
  | 'TRABAJO_EN_CALIENTE'
  | 'TRABAJO_ELECTRICO'
  | 'IZAJE_DE_CARGA'
  | 'EXCAVACION'
  | 'OTRO'

export interface PetarInput {
  /** Tipo de trabajo de alto riesgo */
  tipo: TipoTrabajoAltoRiesgo
  /** Descripción específica del trabajo */
  descripcion: string
  /** Ubicación exacta (sede + área) */
  ubicacion: string
  /** Fecha y hora de inicio */
  fechaInicio: Date
  /** Fecha y hora de fin estimada */
  fechaFin: Date
  /** Ejecutores autorizados (Nombre + DNI) */
  ejecutores: Array<{ nombre: string; dni: string; cargo?: string }>
  /** Supervisor responsable de la autorización */
  supervisorNombre: string
  supervisorDni: string
  /** Peligros específicos identificados */
  peligros: string[]
  /** Controles de mitigación aplicados */
  controles: string[]
  /** EPP verificado */
  eppVerificado: string[]
  /** Equipos verificados (con fecha de última inspección) */
  equiposVerificados: Array<{ equipo: string; ultimaInspeccion?: string }>
  /** Aislamiento / bloqueos aplicados (LOTO) */
  aislamientos?: string[]
  /** Plan de contingencia */
  contingencia: string
}

// ── ATS ────────────────────────────────────────────────────────────────────

export interface AtsInput {
  /** Tarea / actividad del día */
  tarea: string
  /** Equipo ejecutor */
  ejecutores: Array<{ nombre: string; dni: string }>
  /** Supervisor responsable */
  supervisor: { nombre: string; dni: string }
  /** Sede / área */
  ubicacion: string
  /** Fecha del análisis */
  fecha: Date
  /** Pasos de la tarea con peligros + controles para cada uno */
  pasos: Array<{
    numero: number
    paso: string
    peligros: string[]
    controles: string[]
  }>
  /** EPP requerido */
  epp: string[]
  /** Observaciones generales */
  observaciones?: string
}

// ── Utilidades de cabecera común ───────────────────────────────────────────

export interface DocHeaderInfo {
  empresa: string
  ruc?: string | null
  area?: string | null
  fechaImpresion: Date
}

export const TIPO_TRABAJO_LABELS: Record<TipoTrabajoAltoRiesgo, string> = {
  TRABAJO_EN_ALTURAS: 'Trabajo en alturas',
  ESPACIO_CONFINADO: 'Espacio confinado',
  TRABAJO_EN_CALIENTE: 'Trabajo en caliente (soldadura, corte)',
  TRABAJO_ELECTRICO: 'Trabajo eléctrico',
  IZAJE_DE_CARGA: 'Izaje de carga',
  EXCAVACION: 'Excavación / Trabajo en zanjas',
  OTRO: 'Otro trabajo de alto riesgo',
}

/**
 * Validador genérico de un documento. Retorna lista de errores por campo.
 * Cliente UI usa para deshabilitar el botón "Generar" si hay problemas.
 */
export function validatePets(input: PetsInput): string[] {
  const errs: string[] = []
  if (input.titulo.length < 3) errs.push('Título muy corto')
  if (input.objetivo.length < 10) errs.push('Objetivo debe tener al menos 10 caracteres')
  if (input.pasos.length === 0) errs.push('Agrega al menos un paso')
  if (input.epp.length === 0) errs.push('Define el EPP obligatorio')
  return errs
}

export function validatePetar(input: PetarInput): string[] {
  const errs: string[] = []
  if (input.descripcion.length < 10) errs.push('Descripción muy corta')
  if (input.ejecutores.length === 0) errs.push('Indica al menos un ejecutor')
  if (!input.supervisorNombre) errs.push('Indica el supervisor responsable')
  if (input.peligros.length === 0) errs.push('Lista los peligros identificados')
  if (input.controles.length === 0) errs.push('Lista los controles aplicados')
  if (input.fechaFin <= input.fechaInicio) errs.push('La fecha fin debe ser posterior al inicio')
  return errs
}

export function validateAts(input: AtsInput): string[] {
  const errs: string[] = []
  if (input.tarea.length < 5) errs.push('Describe la tarea con más detalle')
  if (input.ejecutores.length === 0) errs.push('Lista al menos un ejecutor')
  if (input.pasos.length === 0) errs.push('Agrega al menos un paso')
  return errs
}
