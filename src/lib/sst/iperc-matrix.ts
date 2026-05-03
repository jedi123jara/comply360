/**
 * Motor IPERC determinístico — matriz P × S oficial SUNAFIL
 * R.M. 050-2013-TR (Tablas 9, 11, 12)
 *
 * Función pura, auditable, defendible en juicio. Sin LLM, sin no-determinismo.
 * El LLM solo redacta texto narrativo aparte; los índices SIEMPRE los calcula
 * esta función.
 */

import { NivelRiesgoIPERC } from '../../generated/prisma/client'

export interface IpercInputs {
  /** A — Personas expuestas: 1 (1-3), 2 (4-12), 3 (>12) */
  indicePersonas: number
  /** B — Procedimientos existentes: 1 (satisfactorios), 2 (parciales), 3 (no existen) */
  indiceProcedimiento: number
  /** C — Capacitación: 1 (entrenado), 2 (parcial), 3 (no entrenado) */
  indiceCapacitacion: number
  /** D — Exposición: 1 (esporádico/anual), 2 (eventual/mensual), 3 (permanente/diario) */
  indiceExposicion: number
  /** Severidad (S): 1 (lig. dañino), 2 (dañino), 3 (ext. dañino) */
  indiceSeveridad: number
}

export interface IpercResult {
  /** Probabilidad IP = A + B + C + D (rango 4-12) */
  indiceProbabilidad: number
  /** Severidad IS (rango 1-3) */
  indiceSeveridad: number
  /** Nivel de Riesgo NR = IP × IS (rango 4-36) */
  nivelRiesgo: number
  /** Clasificación oficial SUNAFIL */
  clasificacion: NivelRiesgoIPERC
  /** Si es Moderado, Importante o Intolerable (requiere acción documentada) */
  esSignificativo: boolean
  /** SLA interno COMPLY360 para el plan de acción (días) */
  slaPlanAccionDias: number | null
  /** Texto literal de la acción según Tabla 11 R.M. 050-2013-TR */
  accionRecomendada: string
}

const RANGE_1_3 = (n: number) => Number.isInteger(n) && n >= 1 && n <= 3

/** Valida que todos los índices estén en su rango oficial. */
function validateInputs(inputs: IpercInputs): void {
  const { indicePersonas, indiceProcedimiento, indiceCapacitacion, indiceExposicion, indiceSeveridad } = inputs
  if (!RANGE_1_3(indicePersonas)) {
    throw new Error(`indicePersonas debe ser entero 1..3 (recibido: ${indicePersonas})`)
  }
  if (!RANGE_1_3(indiceProcedimiento)) {
    throw new Error(`indiceProcedimiento debe ser entero 1..3 (recibido: ${indiceProcedimiento})`)
  }
  if (!RANGE_1_3(indiceCapacitacion)) {
    throw new Error(`indiceCapacitacion debe ser entero 1..3 (recibido: ${indiceCapacitacion})`)
  }
  if (!RANGE_1_3(indiceExposicion)) {
    throw new Error(`indiceExposicion debe ser entero 1..3 (recibido: ${indiceExposicion})`)
  }
  if (!RANGE_1_3(indiceSeveridad)) {
    throw new Error(`indiceSeveridad debe ser entero 1..3 (recibido: ${indiceSeveridad})`)
  }
}

/**
 * Clasificación según Tabla 11 R.M. 050-2013-TR:
 *   4         → Trivial
 *   5  - 8    → Tolerable
 *   9  - 16   → Moderado
 *   17 - 24   → Importante
 *   25 - 36   → Intolerable
 */
function clasificarNivelRiesgo(nr: number): NivelRiesgoIPERC {
  if (nr === 4) return NivelRiesgoIPERC.TRIVIAL
  if (nr >= 5 && nr <= 8) return NivelRiesgoIPERC.TOLERABLE
  if (nr >= 9 && nr <= 16) return NivelRiesgoIPERC.MODERADO
  if (nr >= 17 && nr <= 24) return NivelRiesgoIPERC.IMPORTANTE
  if (nr >= 25 && nr <= 36) return NivelRiesgoIPERC.INTOLERABLE
  // Defensivo: nunca debería ocurrir si validateInputs pasó.
  throw new Error(`Nivel de riesgo fuera de rango: ${nr}`)
}

/**
 * SLA interno COMPLY360 según severidad de la clasificación.
 * Trivial / Tolerable: no requiere SLA (acción opcional).
 * Moderado: 60 días para implementar plan.
 * Importante: 15 días + alertas semanales hasta cierre.
 * Intolerable: alerta ROJA inmediata + bloqueo de UI hasta justificación.
 */
function slaPorClasificacion(c: NivelRiesgoIPERC): number | null {
  switch (c) {
    case NivelRiesgoIPERC.TRIVIAL:
    case NivelRiesgoIPERC.TOLERABLE:
      return null
    case NivelRiesgoIPERC.MODERADO:
      return 60
    case NivelRiesgoIPERC.IMPORTANTE:
      return 15
    case NivelRiesgoIPERC.INTOLERABLE:
      return 0 // alerta inmediata
  }
}

/**
 * Texto literal de Tabla 11 R.M. 050-2013-TR. Estos son los textos oficiales
 * SUNAFIL — citados literalmente para defensa jurídica.
 */
function accionRecomendada(c: NivelRiesgoIPERC): string {
  switch (c) {
    case NivelRiesgoIPERC.TRIVIAL:
      return 'No se necesita adoptar ninguna acción.'
    case NivelRiesgoIPERC.TOLERABLE:
      return 'No se necesita mejorar la acción preventiva. Se requieren comprobaciones periódicas para asegurar que se mantiene la eficacia de las medidas de control.'
    case NivelRiesgoIPERC.MODERADO:
      return 'Se deben hacer esfuerzos para reducir el riesgo, determinando las inversiones precisas. Las medidas para reducir el riesgo deben implantarse en un período determinado.'
    case NivelRiesgoIPERC.IMPORTANTE:
      return 'No debe comenzarse el trabajo hasta que se haya reducido el riesgo. Puede que se precisen recursos considerables para controlar el riesgo. Cuando el riesgo corresponda a un trabajo que se está realizando, debe remediarse el problema en un tiempo inferior al de los riesgos moderados.'
    case NivelRiesgoIPERC.INTOLERABLE:
      return 'No se debe comenzar ni continuar el trabajo hasta que se reduzca el riesgo. Si no es posible reducir el riesgo, incluso con recursos ilimitados, debe prohibirse el trabajo.'
  }
}

/**
 * Calcula el nivel de riesgo IPERC según matriz oficial SUNAFIL.
 *
 * IP = A + B + C + D (rango 4-12)
 * NR = IP × IS (rango 4-36)
 *
 * @throws Error si algún índice está fuera de rango 1..3.
 */
export function calcularNivelRiesgo(inputs: IpercInputs): IpercResult {
  validateInputs(inputs)

  const indiceProbabilidad =
    inputs.indicePersonas +
    inputs.indiceProcedimiento +
    inputs.indiceCapacitacion +
    inputs.indiceExposicion

  const indiceSeveridad = inputs.indiceSeveridad
  const nivelRiesgo = indiceProbabilidad * indiceSeveridad
  const clasificacion = clasificarNivelRiesgo(nivelRiesgo)
  const esSignificativo =
    clasificacion === NivelRiesgoIPERC.MODERADO ||
    clasificacion === NivelRiesgoIPERC.IMPORTANTE ||
    clasificacion === NivelRiesgoIPERC.INTOLERABLE

  return {
    indiceProbabilidad,
    indiceSeveridad,
    nivelRiesgo,
    clasificacion,
    esSignificativo,
    slaPlanAccionDias: slaPorClasificacion(clasificacion),
    accionRecomendada: accionRecomendada(clasificacion),
  }
}
