/**
 * IPERC Matrix Template - R.M. 050-2013-TR
 * Identificacion de Peligros, Evaluacion de Riesgos y Medidas de Control
 */

// =============================================
// Types
// =============================================

export type PeligroTipo =
  | 'FISICO'
  | 'QUIMICO'
  | 'BIOLOGICO'
  | 'ERGONOMICO'
  | 'PSICOSOCIAL'
  | 'MECANICO'
  | 'ELECTRICO'

export type NivelRiesgo =
  | 'TRIVIAL'       // 1-4
  | 'TOLERABLE'     // 5-8
  | 'MODERADO'      // 9-16
  | 'IMPORTANTE'    // 17-24
  | 'INTOLERABLE'   // 25+

export type MedidaControlTipo =
  | 'ELIMINACION'
  | 'SUSTITUCION'
  | 'INGENIERIA'
  | 'ADMINISTRATIVO'
  | 'EPP'

export type Severidad = 1 | 2 | 3 // 1=Leve, 2=Moderado, 3=Grave/Mortal

export interface ProbabilidadFactors {
  personasExpuestas: number  // 1=1-3, 2=4-12, 3=12+
  controles: number          // 1=Existen y son adecuados, 2=Parciales, 3=No existen
  capacitacion: number       // 1=Personal capacitado, 2=Parcialmente, 3=No capacitado
  exposicion: number         // 1=Esporadica, 2=Eventual, 3=Permanente
}

export interface MedidaControl {
  tipo: MedidaControlTipo
  descripcion: string
  responsable: string
  fecha: string | null
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'IMPLEMENTADA'
}

export interface IpercEntry {
  // Contexto
  proceso: string
  area: string
  actividad: string
  tarea: string
  // Peligro
  peligroTipo: PeligroTipo
  peligroDescripcion: string
  // Riesgo
  riesgoAsociado: string
  consecuencia: string
  // Evaluacion
  probabilidadFactors: ProbabilidadFactors
  probabilidad: number     // Sum of factors (4-12 mapped to 1-5)
  severidad: Severidad
  nivelRiesgo: number      // probabilidad * severidad
  nivelRiesgoLabel: NivelRiesgo
  // Control
  medidasControl: MedidaControl[]
  // Responsable
  responsable: string
  fecha: string
}

// =============================================
// Constants
// =============================================

export const PELIGRO_TIPOS: Record<PeligroTipo, { label: string; ejemplos: string[] }> = {
  FISICO: {
    label: 'Fisico',
    ejemplos: ['Ruido', 'Vibracion', 'Iluminacion inadecuada', 'Temperatura extrema', 'Radiacion', 'Presion'],
  },
  QUIMICO: {
    label: 'Quimico',
    ejemplos: ['Polvo', 'Humo', 'Gases', 'Vapores', 'Sustancias toxicas', 'Liquidos inflamables'],
  },
  BIOLOGICO: {
    label: 'Biologico',
    ejemplos: ['Virus', 'Bacterias', 'Hongos', 'Parasitos', 'Picaduras/mordeduras', 'Fluidos corporales'],
  },
  ERGONOMICO: {
    label: 'Ergonomico',
    ejemplos: ['Postura forzada', 'Movimiento repetitivo', 'Sobreesfuerzo', 'Pantalla prolongada', 'Carga manual'],
  },
  PSICOSOCIAL: {
    label: 'Psicosocial',
    ejemplos: ['Estres laboral', 'Carga mental', 'Hostigamiento', 'Trabajo nocturno', 'Monotonia', 'Aislamiento'],
  },
  MECANICO: {
    label: 'Mecanico',
    ejemplos: ['Caida de altura', 'Caida al mismo nivel', 'Golpes', 'Atrapamiento', 'Cortes', 'Proyeccion de particulas'],
  },
  ELECTRICO: {
    label: 'Electrico',
    ejemplos: ['Contacto directo', 'Contacto indirecto', 'Electricidad estatica', 'Cortocircuito', 'Arco electrico'],
  },
}

export const SEVERIDAD_LABELS: Record<Severidad, string> = {
  1: 'Leve (lesion sin incapacidad)',
  2: 'Moderado (lesion con incapacidad temporal)',
  3: 'Grave (lesion con incapacidad permanente o mortal)',
}

export const MEDIDA_CONTROL_LABELS: Record<MedidaControlTipo, { label: string; descripcion: string; prioridad: number }> = {
  ELIMINACION: { label: 'Eliminacion', descripcion: 'Eliminar el peligro de raiz', prioridad: 1 },
  SUSTITUCION: { label: 'Sustitucion', descripcion: 'Sustituir por algo menos peligroso', prioridad: 2 },
  INGENIERIA: { label: 'Control de Ingenieria', descripcion: 'Barreras fisicas, ventilacion, aislamiento', prioridad: 3 },
  ADMINISTRATIVO: { label: 'Control Administrativo', descripcion: 'Procedimientos, senalizacion, capacitacion, rotacion', prioridad: 4 },
  EPP: { label: 'EPP', descripcion: 'Equipo de Proteccion Personal', prioridad: 5 },
}

export const NIVEL_RIESGO_CONFIG: Record<NivelRiesgo, { label: string; color: string; bgColor: string; rango: string; accion: string }> = {
  TRIVIAL: {
    label: 'Trivial',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    rango: '1-4',
    accion: 'No se necesita accion especifica',
  },
  TOLERABLE: {
    label: 'Tolerable',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    rango: '5-8',
    accion: 'No es necesario mejorar la accion preventiva pero se deben considerar soluciones rentables',
  },
  MODERADO: {
    label: 'Moderado',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    rango: '9-16',
    accion: 'Se deben hacer esfuerzos para reducir el riesgo en un plazo determinado',
  },
  IMPORTANTE: {
    label: 'Importante',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    rango: '17-24',
    accion: 'No se debe comenzar el trabajo hasta que se haya reducido el riesgo',
  },
  INTOLERABLE: {
    label: 'Intolerable',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    rango: '25+',
    accion: 'No se debe comenzar ni continuar el trabajo hasta que se reduzca el riesgo. Prohibir el trabajo.',
  },
}

// =============================================
// Calculation Functions
// =============================================

/**
 * Calculate probability from the 4 factors (R.M. 050-2013-TR method)
 * Each factor is 1-3, total range 4-12
 * Mapped to probability scale 1-5:
 *   4-5  -> 1 (Baja)
 *   6-7  -> 2 (Media baja)
 *   8-9  -> 3 (Media)
 *   10-11 -> 4 (Media alta)
 *   12   -> 5 (Alta)
 */
export function calcularProbabilidad(factors: ProbabilidadFactors): number {
  const total = factors.personasExpuestas + factors.controles + factors.capacitacion + factors.exposicion
  if (total <= 5) return 1
  if (total <= 7) return 2
  if (total <= 9) return 3
  if (total <= 11) return 4
  return 5
}

/**
 * Calculate risk level = probability x severity
 * Result is mapped to risk category
 */
export function calcularNivelRiesgo(probabilidad: number, severidad: Severidad): { nivel: number; label: NivelRiesgo } {
  const nivel = probabilidad * severidad
  let label: NivelRiesgo
  if (nivel <= 4) label = 'TRIVIAL'
  else if (nivel <= 8) label = 'TOLERABLE'
  else if (nivel <= 16) label = 'MODERADO'
  else if (nivel <= 24) label = 'IMPORTANTE'
  else label = 'INTOLERABLE'

  return { nivel, label }
}

/**
 * Validate an IPERC entry has all required fields
 */
export function validateIpercEntry(entry: Partial<IpercEntry>): string[] {
  const errors: string[] = []

  if (!entry.proceso) errors.push('Proceso es requerido')
  if (!entry.area) errors.push('Area es requerida')
  if (!entry.actividad) errors.push('Actividad es requerida')
  if (!entry.tarea) errors.push('Tarea es requerida')
  if (!entry.peligroTipo) errors.push('Tipo de peligro es requerido')
  if (!entry.peligroDescripcion) errors.push('Descripcion del peligro es requerida')
  if (!entry.riesgoAsociado) errors.push('Riesgo asociado es requerido')
  if (!entry.consecuencia) errors.push('Consecuencia es requerida')
  if (!entry.severidad || ![1, 2, 3].includes(entry.severidad)) errors.push('Severidad debe ser 1, 2 o 3')
  if (!entry.probabilidadFactors) {
    errors.push('Factores de probabilidad son requeridos')
  } else {
    const f = entry.probabilidadFactors
    if (f.personasExpuestas < 1 || f.personasExpuestas > 3) errors.push('Personas expuestas debe ser 1-3')
    if (f.controles < 1 || f.controles > 3) errors.push('Controles debe ser 1-3')
    if (f.capacitacion < 1 || f.capacitacion > 3) errors.push('Capacitacion debe ser 1-3')
    if (f.exposicion < 1 || f.exposicion > 3) errors.push('Exposicion debe ser 1-3')
  }
  if (!entry.responsable) errors.push('Responsable es requerido')

  return errors
}

/**
 * Build a complete IPERC entry from partial data (calculate derived fields)
 */
export function buildIpercEntry(input: {
  proceso: string
  area: string
  actividad: string
  tarea: string
  peligroTipo: PeligroTipo
  peligroDescripcion: string
  riesgoAsociado: string
  consecuencia: string
  probabilidadFactors: ProbabilidadFactors
  severidad: Severidad
  medidasControl: MedidaControl[]
  responsable: string
  fecha: string
}): IpercEntry {
  const probabilidad = calcularProbabilidad(input.probabilidadFactors)
  const { nivel, label } = calcularNivelRiesgo(probabilidad, input.severidad)

  return {
    ...input,
    probabilidad,
    nivelRiesgo: nivel,
    nivelRiesgoLabel: label,
  }
}
