import { z } from 'zod'
import { validatePeruvianDni } from './dni'

// =============================================
// Zod enum mirrors — must match prisma/schema.prisma
// =============================================

export const RegimenLaboralEnum = z.enum([
  'GENERAL',
  'MYPE_MICRO',
  'MYPE_PEQUENA',
  'AGRARIO',
  'CONSTRUCCION_CIVIL',
  'MINERO',
  'PESQUERO',
  'TEXTIL_EXPORTACION',
  'DOMESTICO',
  'CAS',
  'MODALIDAD_FORMATIVA',
  'TELETRABAJO',
])

export const TipoContratoEnum = z.enum([
  'INDEFINIDO',
  'PLAZO_FIJO',
  'TIEMPO_PARCIAL',
  'INICIO_ACTIVIDAD',
  'NECESIDAD_MERCADO',
  'RECONVERSION',
  'SUPLENCIA',
  'EMERGENCIA',
  'OBRA_DETERMINADA',
  'INTERMITENTE',
  'EXPORTACION',
])

export const TipoAporteEnum = z.enum(['AFP', 'ONP', 'SIN_APORTE'])

export const WorkerStatusEnum = z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'])

// =============================================
// Create Worker Schema
// =============================================

export const createWorkerSchema = z.object({
  // --- Datos personales ---
  // FIX #6.A: validamos contra patrones obviamente falsos (00000000,
  // 12345678, repetidos). Si se trae el CDV (9 chars), validamos el
  // dígito verificador con el algoritmo RENIEC. Sin RENIEC API la
  // verificación es heurística pero atrapa typos y fakes evidentes.
  dni: z
    .string()
    .min(8, 'DNI debe tener al menos 8 digitos')
    .max(9, 'DNI no debe exceder 9 caracteres (8 digitos + CDV opcional)')
    .superRefine((value, ctx) => {
      const result = validatePeruvianDni(value)
      if (!result.valid) {
        ctx.addIssue({
          code: 'custom',
          message: result.reason ?? 'DNI inválido',
        })
      }
    }),
  firstName: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  lastName: z
    .string()
    .min(2, 'Apellido debe tener al menos 2 caracteres')
    .max(100, 'Apellido no puede exceder 100 caracteres'),
  email: z
    .string()
    .email('Email invalido')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(9, 'Telefono debe tener al menos 9 digitos')
    .max(15, 'Telefono no puede exceder 15 caracteres')
    .optional()
    .or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.enum(['M', 'F', 'OTRO']).optional(),
  nationality: z.string().max(50).optional().default('peruana'),
  address: z.string().max(500, 'Direccion no puede exceder 500 caracteres').optional().or(z.literal('')),

  // --- Datos laborales ---
  position: z
    .string()
    .max(200, 'Cargo no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  department: z
    .string()
    .max(200, 'Area no puede exceder 200 caracteres')
    .optional()
    .or(z.literal('')),
  regimenLaboral: RegimenLaboralEnum.default('GENERAL'),
  tipoContrato: TipoContratoEnum.default('INDEFINIDO'),
  fechaIngreso: z
    .string({ error: 'Fecha de ingreso es requerida' })
    .min(1, 'Fecha de ingreso es requerida')
    .or(z.date()),
  fechaCese: z.string().optional().or(z.date()).or(z.literal('')),
  motivoCese: z.string().max(500).optional().or(z.literal('')),
  sueldoBruto: z
    .number({ error: 'Sueldo bruto es requerido' })
    .positive('Sueldo debe ser positivo')
    .max(1000000, 'Sueldo no puede exceder S/ 1,000,000'),
  asignacionFamiliar: z.boolean().default(false),
  jornadaSemanal: z
    .number()
    .int('Jornada semanal debe ser un numero entero')
    .min(1, 'Jornada minima es 1 hora')
    .max(48, 'Jornada maxima legal es 48 horas semanales')
    .default(48),
  tiempoCompleto: z.boolean().default(true),

  // --- Datos previsionales ---
  tipoAporte: TipoAporteEnum.default('AFP'),
  afpNombre: z.string().max(50).optional().or(z.literal('')),
  cuspp: z
    .string()
    .regex(/^[A-Z0-9]{12}$/, 'CUSPP debe tener 12 caracteres alfanumericos')
    .optional()
    .or(z.literal('')),
  essaludVida: z.boolean().default(false),
  sctr: z.boolean().default(false),
})

/** Partial schema for PATCH/PUT updates — every field optional */
export const updateWorkerSchema = createWorkerSchema.partial()

/** Filter/search params for GET /api/workers */
export const workerFilterSchema = z.object({
  status: WorkerStatusEnum.optional(),
  regimenLaboral: RegimenLaboralEnum.optional(),
  department: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// =============================================
// Inferred TypeScript types
// =============================================

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>
export type WorkerFilter = z.infer<typeof workerFilterSchema>
