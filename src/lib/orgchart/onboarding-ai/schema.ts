/**
 * Schemas Zod para el output del Onboarding IA.
 *
 * El LLM debe devolver una estructura estricta que pasa por estas validaciones
 * antes de aplicarse. Si falla, hay fallback a `templates.ts` (determinista).
 */
import { z } from 'zod'

// Reutilizo los kinds del enum Prisma para no duplicar.
export const UNIT_KINDS = [
  'GERENCIA',
  'AREA',
  'DEPARTAMENTO',
  'EQUIPO',
  'COMITE_LEGAL',
  'BRIGADA',
  'PROYECTO',
] as const

export const onboardingUnitSchema = z.object({
  key: z.string().min(1).max(40),
  name: z.string().min(2).max(80),
  kind: z.enum(UNIT_KINDS),
  parentKey: z.string().nullable(),
  description: z.string().max(200).optional(),
})

export const onboardingPositionSchema = z.object({
  key: z.string().min(1).max(40),
  title: z.string().min(2).max(80),
  unitKey: z.string().min(1),
  reportsToKey: z.string().nullable(),
  isManagerial: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  seats: z.number().int().min(1).max(50).default(1),
  purpose: z.string().max(300).optional(),
})

export const onboardingProposalSchema = z.object({
  rationale: z.string().max(800),
  units: z.array(onboardingUnitSchema).min(1).max(40),
  positions: z.array(onboardingPositionSchema).min(1).max(80),
  /** Roles legales sugeridos (solo el tipo, el orgchart designará después). */
  suggestedComplianceRoles: z
    .array(
      z.object({
        roleType: z.string().min(2),
        reason: z.string().max(200),
      }),
    )
    .max(15)
    .default([]),
})

export type OnboardingUnit = z.infer<typeof onboardingUnitSchema>
export type OnboardingPosition = z.infer<typeof onboardingPositionSchema>
export type OnboardingProposal = z.infer<typeof onboardingProposalSchema>

// Input del wizard (3 pasos)
export const onboardingInputSchema = z.object({
  industry: z.string().min(2).max(60),
  sizeRange: z.enum(['MICRO', 'PEQUEÑA', 'MEDIANA', 'GRANDE']),
  workerCount: z.number().int().min(1).max(2000),
  city: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
})

export type OnboardingInput = z.infer<typeof onboardingInputSchema>
