// =============================================
// CONTRACT VALIDATION ENGINE — TYPES
// Generador de Contratos / Chunk 1
//
// Las reglas se persisten en BD (ContractValidationRule.ruleSpec) como JSON
// y se evalúan contra un ValidationContext armado en runtime desde
// Contract + Worker(s) + Organization.
//
// Diseño: ruleSpec = unión discriminada por `kind`. Cada `kind` es una
// función pura evaluable sin efectos secundarios (la conexión a BD vive
// solo en el context-builder y el engine que persiste resultados).
// =============================================

import type { ContractType, RegimenLaboral, ValidationSeverity } from '@/generated/prisma/client'

// ─── Contexto de evaluación ────────────────────────────────────────────────
// Snapshot inmutable que el context-builder arma para una corrida.

export interface ValidationContext {
  contract: {
    id: string
    type: ContractType
    title: string
    status: string
    startDate: Date | null
    endDate: Date | null
    causeObjective: string | null
    position: string | null
    monthlySalary: number | null
    weeklyHours: number | null
    formData: Record<string, unknown> | null
    contentHtml: string | null
  }
  organization: {
    id: string
    regimenPrincipal: string | null
    ruc: string | null
  }
  workers: ReadonlyArray<{
    id: string
    dni: string
    fullName: string
    regimenLaboral: RegimenLaboral
    fechaIngreso: Date
    sueldoBruto: number
    isPregnant?: boolean // gestante (input externo — flag manual / módulo workers)
    nationality: string | null
  }>
  // Histórico de contratos modales del mismo trabajador (para PLAZO-001 — suma 5 años)
  workerModalHistory: ReadonlyArray<{
    contractId: string
    type: ContractType
    startDate: Date
    endDate: Date | null
    durationDays: number
  }>
  // Constantes peruanas snapshot — leídas en runtime para que cambios anuales
  // no rompan corridas históricas.
  constants: {
    UIT: number
    RMV: number
    MAX_MODAL_TOTAL_DAYS: number // 1825 (5 años)
  }
}

// ─── Especificación declarativa de reglas ──────────────────────────────────
// Cada `kind` es self-contained: el evaluador conoce qué hacer con cada uno
// sin necesidad de imports adicionales. Agregar un nuevo kind = extender
// la unión + agregar handler en rule-evaluator.ts.

export type RuleSpec =
  /**
   * Verifica que un campo string del contrato esté presente y tenga al menos
   * `min` caracteres. Útil para "causa objetiva no vacía".
   * Path soporta dotted (ej: "contract.causeObjective", "contract.formData.cargo").
   */
  | { kind: 'FIELD_REQUIRED'; field: string; min?: number }

  /**
   * Verifica que un campo NO matchee ninguno de los patrones (regex) provistos.
   * Útil para causas objetivas genéricas tipo "incremento de actividad" sin más.
   */
  | { kind: 'FIELD_REGEX_DENY'; field: string; patterns: string[]; flags?: string }

  /**
   * Verifica que un campo SÍ matchee al menos uno de los patrones.
   * Útil para "RUC válido", "DNI 8 dígitos", etc.
   */
  | { kind: 'FIELD_REGEX_REQUIRE'; field: string; patterns: string[]; flags?: string }

  /**
   * Compara dos campos numéricos: leftPath OP rightValue (constante o path).
   * Útil para "salario >= RMV", "endDate - startDate <= maxDays".
   */
  | {
      kind: 'FIELD_COMPARE'
      leftPath: string // path en context (ej: "contract.monthlySalary")
      operator: '>' | '>=' | '<' | '<=' | '==' | '!='
      rightValue: number | string // path o literal numérico
      rightIsPath?: boolean // true si rightValue es un path en context
    }

  /**
   * Duración en días entre dos fechas: (endPath - startPath) <op> maxDays
   * Si endPath es null, retorna `passed: true` (no aplica) salvo que `requireEnd: true`.
   */
  | {
      kind: 'DURATION_MAX_DAYS'
      startPath: string
      endPath: string
      maxDays: number
      requireEnd?: boolean // si true → falla cuando endPath es null
    }

  /**
   * Suma de duraciones de contratos modales históricos del mismo trabajador
   * + el contrato actual no debe exceder maxDays. Lee workerModalHistory.
   */
  | { kind: 'WORKER_MODAL_SUM_MAX_DAYS'; maxDays: number }

  /**
   * Verifica que un campo del contrato (ej: contract.formData.titularSuplido)
   * esté presente cuando el tipo de contrato sea uno de los listados.
   */
  | {
      kind: 'CONDITIONAL_FIELD_REQUIRED'
      whenContractTypeIn: ContractType[]
      requiredField: string
    }

  /**
   * Bloqueo tutelar: si algún worker vinculado tiene una bandera (ej. gestante)
   * y el contrato es modal con endDate cercana → flag.
   */
  | { kind: 'TUTELA_GESTANTE_NO_RENEWAL' }

  /**
   * Verifica que el horario semanal (contract.weeklyHours) esté en un rango.
   * Útil para tiempo parcial: < 24h/sem (4h/día x 6 días).
   */
  | {
      kind: 'WEEKLY_HOURS_RANGE'
      min?: number
      max?: number
    }

// ─── Resultado de una evaluación ───────────────────────────────────────────

export interface RuleEvaluationResult {
  passed: boolean
  message: string
  evidence?: Record<string, unknown>
}

// ─── Reglas aplicables ─────────────────────────────────────────────────────
// `appliesTo` permite filtrar qué reglas corren contra qué contratos.

export interface RuleAppliesTo {
  contractTypes?: ContractType[]
  regimes?: RegimenLaboral[]
}

// ─── Definición completa de una regla (forma usada en seeds) ───────────────

export interface ContractRuleDefinition {
  code: string
  category: string
  severity: ValidationSeverity
  title: string
  description: string
  legalBasis: string
  ruleSpec: RuleSpec
  appliesTo: RuleAppliesTo | null
  version: string
}

// ─── Salida del engine completo ─────────────────────────────────────────────

export interface ValidationRunResult {
  contractId: string
  totalRules: number
  blockers: number
  warnings: number
  infos: number
  passed: number
  failed: number
  results: Array<{
    ruleId: string
    ruleCode: string
    ruleVersion: string
    severity: ValidationSeverity
    passed: boolean
    message: string
    evidence?: Record<string, unknown>
  }>
}
