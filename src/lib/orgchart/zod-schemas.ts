import { z } from 'zod'

const UNIT_KINDS = ['GERENCIA', 'AREA', 'DEPARTAMENTO', 'EQUIPO', 'COMITE_LEGAL', 'BRIGADA', 'PROYECTO'] as const
const COMPLIANCE_ROLE_TYPES = [
  'PRESIDENTE_COMITE_SST',
  'SECRETARIO_COMITE_SST',
  'REPRESENTANTE_TRABAJADORES_SST',
  'REPRESENTANTE_EMPLEADOR_SST',
  'SUPERVISOR_SST',
  'PRESIDENTE_COMITE_HOSTIGAMIENTO',
  'MIEMBRO_COMITE_HOSTIGAMIENTO',
  'JEFE_INMEDIATO_HOSTIGAMIENTO',
  'BRIGADISTA_PRIMEROS_AUXILIOS',
  'BRIGADISTA_EVACUACION',
  'BRIGADISTA_AMAGO_INCENDIO',
  'DPO_LEY_29733',
  'RT_PLANILLA',
  'RESPONSABLE_IGUALDAD_SALARIAL',
  'ENCARGADO_LIBRO_RECLAMACIONES',
  'MEDICO_OCUPACIONAL',
  'ASISTENTA_SOCIAL',
  'RESPONSABLE_LACTARIO',
  'ENCARGADO_NUTRICION',
] as const

export const createUnitSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  kind: z.enum(UNIT_KINDS).default('AREA'),
  parentId: z.string().cuid().optional().nullable(),
  code: z.string().max(40).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  costCenter: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export const updateUnitSchema = createUnitSchema.partial().extend({
  ifMatchVersion: z.number().int().optional(),
})

export const moveUnitSchema = z.object({
  newParentId: z.string().cuid().nullable(),
  sortOrder: z.number().int().optional(),
  ifMatchVersion: z.number().int().optional(),
})

const positionShape = {
  orgUnitId: z.string().cuid(),
  title: z.string().min(2).max(120),
  code: z.string().max(40).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  level: z.string().max(60).optional().nullable(),
  purpose: z.string().max(4000).optional().nullable(),
  functions: z.array(z.string().min(1).max(500)).optional().nullable(),
  responsibilities: z.array(z.string().min(1).max(500)).optional().nullable(),
  requirements: z
    .object({
      education: z.string().max(1000).optional().nullable(),
      experience: z.string().max(1000).optional().nullable(),
      competencies: z.array(z.string().min(1).max(200)).optional(),
    })
    .optional()
    .nullable(),
  salaryBandMin: z.coerce.number().nonnegative().optional().nullable(),
  salaryBandMax: z.coerce.number().nonnegative().optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  riskCategory: z.string().max(40).optional().nullable(),
  requiresSctr: z.boolean(),
  requiresMedicalExam: z.boolean(),
  isCritical: z.boolean(),
  isManagerial: z.boolean(),
  reportsToPositionId: z.string().cuid().optional().nullable(),
  backupPositionId: z.string().cuid().optional().nullable(),
  seats: z.number().int().positive(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional().nullable(),
}

function refineSalaryBand(
  value: { salaryBandMin?: number | null; salaryBandMax?: number | null },
  ctx: z.RefinementCtx,
) {
  if (
    value.salaryBandMin !== undefined &&
    value.salaryBandMin !== null &&
    value.salaryBandMax !== undefined &&
    value.salaryBandMax !== null &&
    value.salaryBandMax < value.salaryBandMin
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['salaryBandMax'],
      message: 'La banda máxima no puede ser menor que la mínima',
    })
  }
}

export const createPositionSchema = z
  .object({
    ...positionShape,
    requiresSctr: positionShape.requiresSctr.default(false),
    requiresMedicalExam: positionShape.requiresMedicalExam.default(false),
    isCritical: positionShape.isCritical.default(false),
    isManagerial: positionShape.isManagerial.default(false),
    seats: positionShape.seats.default(1),
  })
  .superRefine((value, ctx) => {
    refineSalaryBand(value, ctx)
  })

export const updatePositionSchema = z
  .object({
    ...positionShape,
    orgUnitId: positionShape.orgUnitId.optional(),
    title: positionShape.title.optional(),
    requiresSctr: positionShape.requiresSctr.optional(),
    requiresMedicalExam: positionShape.requiresMedicalExam.optional(),
    isCritical: positionShape.isCritical.optional(),
    isManagerial: positionShape.isManagerial.optional(),
    seats: positionShape.seats.optional(),
  })
  .superRefine((value, ctx) => {
    refineSalaryBand(value, ctx)
  })

export const createAssignmentSchema = z.object({
  workerId: z.string().cuid(),
  positionId: z.string().cuid(),
  isPrimary: z.boolean().default(true),
  isInterim: z.boolean().default(false),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional().nullable(),
  capacityPct: z.number().int().min(1).max(100).default(100),
})

export const createComplianceRoleSchema = z.object({
  workerId: z.string().cuid(),
  roleType: z.enum(COMPLIANCE_ROLE_TYPES),
  unitId: z.string().cuid().optional().nullable(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional().nullable(),
  electedAt: z.string().datetime().optional().nullable(),
  actaUrl: z.string().url().optional().nullable(),
})

export const updateComplianceRoleSchema = z.object({
  endsAt: z.string().datetime().optional().nullable(),
  electedAt: z.string().datetime().optional().nullable(),
  actaUrl: z.union([z.string().url(), z.literal('')]).optional().nullable(),
})

export const createSnapshotSchema = z.object({
  label: z.string().min(2).max(120),
  reason: z.string().max(500).optional().nullable(),
})

export const publicLinkSchema = z.object({
  // 24h/48h/72h cubre auditorías SUNAFIL típicas. 168h (7d) y 360h (15d) para
  // due diligence M&A o procesos largos de homologación con clientes/proveedores.
  expiresInHours: z
    .union([z.literal(24), z.literal(48), z.literal(72), z.literal(168), z.literal(360)])
    .default(48),
  includeWorkers: z.boolean().default(true),
  includeComplianceRoles: z.boolean().default(true),
})

export const seedFromLegacySchema = z.object({
  dryRun: z.boolean().default(false),
})

export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
export type MoveUnitInput = z.infer<typeof moveUnitSchema>
export type CreatePositionInput = z.infer<typeof createPositionSchema>
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>
export type CreateComplianceRoleInput = z.infer<typeof createComplianceRoleSchema>
export type UpdateComplianceRoleInput = z.infer<typeof updateComplianceRoleSchema>
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>
export type PublicLinkInput = z.infer<typeof publicLinkSchema>
