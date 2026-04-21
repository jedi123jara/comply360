import { z } from 'zod'

// =============================================
// Zod enum mirrors — must match prisma/schema.prisma
// =============================================

export const ContractTypeEnum = z.enum([
  'LABORAL_INDEFINIDO',
  'LABORAL_PLAZO_FIJO',
  'LABORAL_TIEMPO_PARCIAL',
  'LOCACION_SERVICIOS',
  'CONFIDENCIALIDAD',
  'NO_COMPETENCIA',
  'POLITICA_HOSTIGAMIENTO',
  'POLITICA_SST',
  'REGLAMENTO_INTERNO',
  'ADDENDUM',
  'CONVENIO_PRACTICAS',
  'CUSTOM',
])

export const ContractStatusEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SIGNED',
  'EXPIRED',
  'ARCHIVED',
])

// =============================================
// Create Contract Schema
// =============================================

export const createContractSchema = z.object({
  templateId: z.string().cuid('ID de plantilla invalido').optional().nullable(),
  type: ContractTypeEnum,
  title: z
    .string()
    .min(3, 'El titulo debe tener al menos 3 caracteres')
    .max(200, 'El titulo no puede exceder 200 caracteres'),
  formData: z.record(z.string(), z.unknown()).optional().nullable(),
  workerIds: z.array(z.string().cuid('ID de trabajador invalido')).optional(),
  expiresAt: z.string().datetime('Fecha de expiracion invalida').optional().nullable(),
})

// =============================================
// Update Contract Schema
// =============================================

export const updateContractSchema = z.object({
  status: ContractStatusEnum.optional(),
  title: z
    .string()
    .min(3, 'El titulo debe tener al menos 3 caracteres')
    .max(200, 'El titulo no puede exceder 200 caracteres')
    .optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  contentHtml: z
    .string()
    .max(500000, 'El contenido excede el limite permitido')
    .optional(),
  expiresAt: z.string().datetime('Fecha de expiracion invalida').optional().nullable(),
})

// =============================================
// Contract Filter Schema
// =============================================

export const contractFilterSchema = z.object({
  type: ContractTypeEnum.optional(),
  status: ContractStatusEnum.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// =============================================
// Inferred TypeScript types
// =============================================

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type ContractFilter = z.infer<typeof contractFilterSchema>
