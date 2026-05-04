/**
 * Operaciones del Copiloto IA del Organigrama.
 *
 * El LLM produce una secuencia de operaciones estructuradas (DSL JSON) que
 * el backend valida con Zod y aplica como un draft. El usuario ve el diff
 * visual antes de confirmar — nunca la IA escribe directamente sobre el árbol
 * real.
 *
 * Cada operación es atómica y referencial:
 *   - createUnit / createPosition usan `tempKey` (id provisional negociable)
 *   - assignWorker referencia un workerId real (validado contra prisma.worker)
 *   - moveUnit / movePosition referencian IDs reales o tempKeys
 */
import { z } from 'zod'
import { UNIT_KINDS } from '../onboarding-ai/schema'

export const createUnitOpSchema = z.object({
  op: z.literal('createUnit'),
  tempKey: z.string().min(1).max(40),
  name: z.string().min(2).max(80),
  kind: z.enum(UNIT_KINDS),
  /** id real existente o tempKey de otra createUnit op. null = raíz. */
  parentRef: z.string().nullable(),
  description: z.string().max(200).optional(),
})

export const createPositionOpSchema = z.object({
  op: z.literal('createPosition'),
  tempKey: z.string().min(1).max(40),
  title: z.string().min(2).max(80),
  /** id real existente o tempKey de createUnit. */
  unitRef: z.string().min(1),
  reportsToRef: z.string().nullable(),
  isManagerial: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  seats: z.number().int().min(1).max(50).default(1),
  purpose: z.string().max(300).optional(),
})

export const assignWorkerOpSchema = z.object({
  op: z.literal('assignWorker'),
  /** id real de cargo o tempKey de createPosition. */
  positionRef: z.string().min(1),
  workerId: z.string().min(1),
  isPrimary: z.boolean().default(true),
  isInterim: z.boolean().default(false),
})

export const movePositionOpSchema = z.object({
  op: z.literal('movePosition'),
  /** id real de cargo. */
  positionId: z.string().min(1),
  /** Nuevo padre — id real o tempKey. */
  newParentRef: z.string().nullable(),
})

export const requireRoleOpSchema = z.object({
  op: z.literal('requireRole'),
  roleType: z.string().min(2),
  /** id real de unidad o tempKey. */
  unitRef: z.string().nullable(),
  /** Razón legal de la designación (base legal). */
  reason: z.string().max(200),
})

export const copilotOpSchema = z.discriminatedUnion('op', [
  createUnitOpSchema,
  createPositionOpSchema,
  assignWorkerOpSchema,
  movePositionOpSchema,
  requireRoleOpSchema,
])

export const copilotPlanSchema = z.object({
  rationale: z.string().max(800),
  operations: z.array(copilotOpSchema).min(1).max(40),
  legalNotes: z.array(z.string().max(300)).max(10).default([]),
})

export type CopilotOperation = z.infer<typeof copilotOpSchema>
export type CopilotPlan = z.infer<typeof copilotPlanSchema>
