// =============================================
// CONTRACT CLAUSE — TYPES
// Generador de Contratos / Chunk 4
// =============================================

import type { ContractType, RegimenLaboral } from '@/generated/prisma/client'

/** Tipo de cada placeholder de la plantilla. */
export type ClauseVariableType = 'text' | 'number' | 'date' | 'select' | 'textarea'

export interface ClauseVariable {
  /** Nombre que aparece en el bodyTemplate como {{key}}. */
  key: string
  label: string
  type: ClauseVariableType
  default?: string | number
  required?: boolean
  helpText?: string
  options?: Array<{ value: string; label: string }>
}

export interface ClauseAppliesTo {
  contractTypes?: ContractType[]
  regimes?: RegimenLaboral[]
}

export type ClauseCategory = 'POTESTATIVA' | 'CAUSA_OBJETIVA' | 'OBLIGATORIA'

export type ClauseType =
  | 'CONFIDENCIALIDAD'
  | 'NO_COMPETENCIA'
  | 'IP'
  | 'PDP'
  | 'EXCLUSIVIDAD'
  | 'PERMANENCIA'
  | 'JORNADA_ATIPICA'
  | 'TELETRABAJO'
  | 'CAUSA_OBJETIVA_INICIO'
  | 'CAUSA_OBJETIVA_SUPLENCIA'
  | 'CAUSA_OBJETIVA_NECESIDAD_MERCADO'

/** Forma usada en `seed-clauses.ts` (datos, no código). */
export interface ContractClauseSeed {
  code: string
  category: ClauseCategory
  type: ClauseType
  title: string
  bodyTemplate: string
  legalBasis: string
  variables: ClauseVariable[]
  applicableTo: ClauseAppliesTo | null
  version: string
}

/** Snapshot persistido en `Contract.formData._selectedClauses`. */
export interface SelectedClause {
  code: string
  /** Versión del catálogo aplicada → trazabilidad reproducible. */
  version: string
  /** Valores de cada variable que produjo este render. */
  values: Record<string, string | number>
  /** Posición ordinal dentro del cuerpo del contrato. */
  position: number
  /** Texto renderizado al insertar (snapshot). */
  renderedText: string
  insertedAt: string
  insertedBy: string
}
