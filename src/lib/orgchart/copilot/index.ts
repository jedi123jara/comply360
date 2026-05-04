/**
 * Copiloto IA del Organigrama — convierte texto natural en operaciones
 * estructuradas que el usuario aprueba antes de aplicar.
 *
 * Flujo:
 *   1. Usuario escribe: "crea una subgerencia comercial con jefe y 2 ejecutivos"
 *   2. /api/orgchart/copilot recibe prompt + estado actual
 *   3. LLM devuelve plan JSON (createUnit + createPosition x3)
 *   4. Validamos con Zod + reglas de referential integrity
 *   5. Cliente recibe el plan y muestra diff visual sobre canvas
 *   6. Usuario hace click "Aplicar" → /api/orgchart/copilot/apply
 *   7. Backend ejecuta en transacción
 */
export { generateCopilotPlan, type CopilotGenerationResult } from './generate-plan'
export { validateCopilotPlan, type PlanValidationResult } from './validate-plan'
export { applyCopilotPlan, type CopilotApplyResult } from './apply-plan'
export {
  copilotPlanSchema,
  copilotOpSchema,
  type CopilotPlan,
  type CopilotOperation,
} from './operations'
