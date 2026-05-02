// =============================================
// REGIME DETECTOR — TYPES
// Generador de Contratos / Chunk 2
//
// Adaptado del artefacto §8 al stack del codebase: usa el enum
// `RegimenLaboral` ya existente (12 valores) en lugar de los nombres
// largos del informe.
// =============================================

import type { RegimenLaboral } from '@/generated/prisma/client'

/**
 * Inputs del algoritmo. Snapshot inmutable que el detector recibe.
 * Mapea 1:1 con campos persistidos en `Organization` + constantes.
 */
export interface RegimeInputs {
  /** CIIU rev. 4 a 4 dígitos (ej. "4100" construcción de edificios). */
  ciiu: string | null
  /** Ubigeo INEI 6 dígitos (dept+prov+dist). Para Lima/Callao detecta agrario excluido. */
  ubigeo: string | null
  /** Ventas anuales en PEN. Si null, MYPE no se puede determinar. */
  annualSalesPEN: number | null
  /** Ventas del grupo económico vinculado en PEN. Si null, se asume = ventas propias. */
  groupAnnualSalesPEN: number | null
  /** True si el grupo consolidado supera el techo MYPE (Ley 32353). */
  isPartOfBigGroup: boolean
  /** Registro REMYPE — habilitante para régimen MYPE. */
  remypeRegistered: boolean
  /** % de exportación 0-100. Si ≥40% y CIIU no tradicional → D.L. 22342. */
  exportRatioPct: number | null
  /** Costo de obra actual en UIT (construcción civil aplica si > 50 UIT). */
  currentProjectCostUIT: number | null
  /** Persona natural o jurídica. */
  employerType: 'NATURAL_PERSON' | 'LEGAL_PERSON'
  /** Empleador persona natural con propósito doméstico → Ley 31047. */
  domesticPurpose: boolean
  /** Agroindustria con insumos agropecuarios → Ley 31110. */
  usesAgroInputs: boolean
  /** Entidad pública → capa Huatuco (STC 5057-2013-PA/TC). */
  isPublicEntity: boolean
  /** UIT vigente. Inyectado para soportar valores históricos. */
  uitValue: number
}

export interface RegimeDetectionResult {
  /** Régimen primario detectado (el que aplica al grueso del personal). */
  primaryRegime: RegimenLaboral
  /** Otros regímenes que la org puede usar para personal específico. */
  applicableSpecialRegimes: RegimenLaboral[]
  /** 0-1: qué tan seguro está el detector. <0.7 implica "completar datos". */
  confidence: number
  /** Cadena de razonamiento humanamente legible. */
  reasoning: string[]
  /** Advertencias que NO son determinantes pero deberían revisarse. */
  warnings: string[]
  /** Tags estructurados para que el motor de validación filtre reglas. */
  flags: {
    isMype: boolean
    isPublic: boolean
    needsRemype: boolean // detecta MYPE candidato pero sin REMYPE
    hasSpecialModalAvailable: boolean
  }
}
