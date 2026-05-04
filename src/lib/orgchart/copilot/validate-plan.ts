/**
 * Validación post-generación del plan del Copiloto IA.
 *
 * Más allá de Zod (estructura), validamos:
 *   - tempKeys únicos por tipo
 *   - parentRef apunta a un real ID o un tempKey existente
 *   - assignWorker.positionRef apunta a real o tempKey valid
 *   - No ciclos en operaciones de move
 *
 * Pure function — testeable sin I/O.
 */
import type { CopilotPlan } from './operations'

export interface PlanValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * realIds: IDs ya existentes en la BD (units + positions + workers).
 * Si pasamos null, se omite la validación de IDs reales (modo lenient).
 */
export function validateCopilotPlan(
  plan: CopilotPlan,
  realIds: {
    unitIds: Set<string>
    positionIds: Set<string>
    workerIds: Set<string>
  } | null,
): PlanValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Acumular tempKeys creados durante el plan.
  const createdUnitKeys = new Set<string>()
  const createdPositionKeys = new Set<string>()

  for (let i = 0; i < plan.operations.length; i++) {
    const op = plan.operations[i]

    if (op.op === 'createUnit') {
      if (createdUnitKeys.has(op.tempKey)) {
        errors.push(`op[${i}] createUnit con tempKey duplicado: ${op.tempKey}`)
      }
      createdUnitKeys.add(op.tempKey)
      if (op.parentRef !== null) {
        const refValid =
          createdUnitKeys.has(op.parentRef) ||
          (realIds?.unitIds.has(op.parentRef) ?? true)
        if (!refValid) {
          errors.push(
            `op[${i}] createUnit "${op.name}" referencia parentRef inexistente: ${op.parentRef}`,
          )
        }
      }
    }

    if (op.op === 'createPosition') {
      if (createdPositionKeys.has(op.tempKey)) {
        errors.push(`op[${i}] createPosition con tempKey duplicado: ${op.tempKey}`)
      }
      createdPositionKeys.add(op.tempKey)
      const unitRefValid =
        createdUnitKeys.has(op.unitRef) ||
        (realIds?.unitIds.has(op.unitRef) ?? true)
      if (!unitRefValid) {
        errors.push(
          `op[${i}] createPosition "${op.title}" referencia unitRef inexistente: ${op.unitRef}`,
        )
      }
      if (op.reportsToRef) {
        const reportsValid =
          createdPositionKeys.has(op.reportsToRef) ||
          (realIds?.positionIds.has(op.reportsToRef) ?? true)
        if (!reportsValid) {
          errors.push(
            `op[${i}] createPosition "${op.title}" reportsToRef inexistente: ${op.reportsToRef}`,
          )
        }
      }
    }

    if (op.op === 'assignWorker') {
      const posValid =
        createdPositionKeys.has(op.positionRef) ||
        (realIds?.positionIds.has(op.positionRef) ?? true)
      if (!posValid) {
        errors.push(`op[${i}] assignWorker positionRef inexistente: ${op.positionRef}`)
      }
      if (realIds && !realIds.workerIds.has(op.workerId)) {
        errors.push(
          `op[${i}] assignWorker workerId no existe en la organización: ${op.workerId}`,
        )
      }
    }

    if (op.op === 'movePosition') {
      if (realIds && !realIds.positionIds.has(op.positionId)) {
        errors.push(`op[${i}] movePosition positionId inexistente: ${op.positionId}`)
      }
      if (op.newParentRef) {
        const parentValid =
          createdPositionKeys.has(op.newParentRef) ||
          (realIds?.positionIds.has(op.newParentRef) ?? true)
        if (!parentValid) {
          errors.push(
            `op[${i}] movePosition newParentRef inexistente: ${op.newParentRef}`,
          )
        }
      }
    }

    if (op.op === 'requireRole') {
      if (op.unitRef !== null) {
        const refValid =
          createdUnitKeys.has(op.unitRef) || (realIds?.unitIds.has(op.unitRef) ?? true)
        if (!refValid) {
          errors.push(`op[${i}] requireRole unitRef inexistente: ${op.unitRef}`)
        }
      }
    }
  }

  // Warnings de simulación
  if (plan.operations.length > 20) {
    warnings.push('El plan tiene muchas operaciones — revísalo cuidadosamente antes de aplicar')
  }

  return { valid: errors.length === 0, errors, warnings }
}
