// =============================================
// JURISPRUDENCE UPDATE — TYPES
// Generador de Contratos / Chunk 9
// =============================================

import type { RuleSpec } from '@/lib/contracts/validation/types'
import type { ValidationSeverity } from '@/generated/prisma/client'

/**
 * Acciones que un JurisprudenceUpdate puede ejecutar sobre el catálogo de
 * reglas (`contract_validation_rules`) cuando se hace apply.
 *
 * - ADD: crea una regla nueva (falla si el code ya existe).
 * - MODIFY: actualiza la regla existente (severity / ruleSpec / version /
 *   title / description / legalBasis). Falla si el code no existe.
 * - DEPRECATE: marca la regla como `active: false` sin borrarla — los
 *   resultados históricos persistidos siguen siendo trazables.
 */
export type RuleAction = 'ADD' | 'MODIFY' | 'DEPRECATE'

export interface RuleAffectation {
  ruleCode: string
  action: RuleAction
  /** Solo para ADD. */
  category?: string
  /** Solo para ADD/MODIFY. */
  severity?: ValidationSeverity
  title?: string
  description?: string
  legalBasis?: string
  ruleSpec?: RuleSpec
  appliesTo?: { contractTypes?: string[]; regimes?: string[] } | null
  /** Versión semver del cambio (default "1.0.0" para ADD, "X.Y.Z" para MODIFY). */
  version?: string
}

/**
 * Acciones sobre el catálogo de cláusulas (`contract_clauses`).
 *  - ADD / MODIFY / DEPRECATE con la misma semántica.
 *  - `bodyTemplatePatch` opcional: aplicar un texto nuevo manteniendo el
 *    code, bumpeando `version`. Las contratos firmados con versiones
 *    previas mantienen su snapshot intacto en `formData._selectedClauses`.
 */
export type ClauseAction = 'ADD' | 'MODIFY' | 'DEPRECATE'

export interface ClauseAffectation {
  code: string
  action: ClauseAction
  category?: string
  type?: string
  title?: string
  bodyTemplate?: string
  legalBasis?: string
  variables?: Array<{
    key: string
    label: string
    type: string
    default?: string | number
    required?: boolean
    helpText?: string
    options?: Array<{ value: string; label: string }>
  }>
  applicableTo?: { contractTypes?: string[]; regimes?: string[] } | null
  version?: string
}

/** Resultado de la ejecución de un apply, persistido en `applyResult`. */
export interface ApplyResult {
  startedAt: string
  finishedAt: string
  rules: Array<{
    ruleCode: string
    action: RuleAction
    status: 'OK' | 'ALREADY_EXISTS' | 'NOT_FOUND' | 'ERROR'
    message?: string
  }>
  clauses: Array<{
    code: string
    action: ClauseAction
    status: 'OK' | 'ALREADY_EXISTS' | 'NOT_FOUND' | 'ERROR'
    message?: string
  }>
  totalChanged: number
  totalSkipped: number
  totalErrors: number
}
