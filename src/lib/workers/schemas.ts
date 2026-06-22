/**
 * Zod schemas para rutas mutadoras de trabajadores, vacaciones y boletas.
 *
 * Convención: mismo estilo que `src/lib/sst/schemas.ts` (zod v4). Español
 * peruano, sin voseo. Estos schemas son PERMISIVOS donde el frontend manda
 * campos opcionales o extra (los forms de alta/edición envían el form completo
 * con campos que el handler ignora: afpComisionTipo, sctrRiesgoNivel,
 * discapacidad, etc.) y ESTRICTOS solo donde un valor inválido corrompe datos
 * o trona Prisma con 500 (enums, fechas, días de vacaciones, workerIds).
 *
 * El default de zod es "strip" (NO rechaza claves desconocidas), por eso los
 * campos extra del form pasan sin romper. No usar `.strict()`.
 */

import { z } from 'zod'

// ── Enums (espejo de prisma/schema.prisma) ────────────────────────────────

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

// Fecha aceptada como ISO datetime con offset o como YYYY-MM-DD (el input
// `type=date` del form manda YYYY-MM-DD). Mismo criterio que sst/schemas.ts.
const fechaFlexible = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Fecha inválida (usa AAAA-MM-DD)'))

// ── POST /api/workers — Alta de trabajador ────────────────────────────────
//
// Permisivo: el form manda muchos opcionales y campos extra. Solo se exige lo
// mínimo que el handler ya requiere (dni/firstName/lastName/fechaIngreso/
// sueldoBruto) y se validan los enums + fechas que hoy llegan crudos.
// sueldoBruto/jornadaSemanal llegan ya como number desde el cliente, pero se
// acepta string por robustez.
export const workerCreateSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  firstName: z.string().min(1, 'Nombres requeridos').max(150),
  lastName: z.string().min(1, 'Apellidos requeridos').max(150),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  birthDate: fechaFlexible.optional().nullable().or(z.literal('')),
  gender: z.string().max(20).optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  position: z.string().max(150).optional().nullable(),
  department: z.string().max(150).optional().nullable(),
  sedeId: z.string().optional().nullable().or(z.literal('')),
  regimenLaboral: RegimenLaboralEnum.optional(),
  tipoContrato: TipoContratoEnum.optional(),
  fechaIngreso: fechaFlexible,
  sueldoBruto: z.union([z.number(), z.string()]),
  asignacionFamiliar: z.boolean().optional(),
  jornadaSemanal: z.union([z.number(), z.string()]).optional(),
  tiempoCompleto: z.boolean().optional(),
  tipoAporte: TipoAporteEnum.optional(),
  afpNombre: z.string().max(60).optional().nullable(),
  afpComisionTipo: z.enum(['FLUJO', 'SALDO', 'MIXTA']).optional().nullable(),
  cuspp: z.string().max(40).optional().nullable(),
  essaludVida: z.boolean().optional(),
  sctr: z.boolean().optional(),
  turnoNocturno: z.boolean().optional(),
})

// ── PUT /api/workers/[id] — Edición parcial ───────────────────────────────
//
// Update parcial: el handler usa `field in body` para decidir qué tocar.
// Por eso NINGÚN campo lleva `.default()` (un default inyectaría claves no
// enviadas y rompería la semántica parcial). Todo opcional; solo se validan
// tipo/enum/fecha. El handler sigue leyendo de `body`, no de parsed.data.
export const workerUpdateSchema = z.object({
  firstName: z.string().min(1).max(150).optional(),
  lastName: z.string().min(1).max(150).optional(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  phone: z.string().max(40).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  position: z.string().max(150).optional().nullable(),
  department: z.string().max(150).optional().nullable(),
  sedeId: z.string().optional().nullable().or(z.literal('')),
  motivoCese: z.string().max(500).optional().nullable(),
  afpNombre: z.string().max(60).optional().nullable(),
  afpComisionTipo: z.enum(['FLUJO', 'SALDO', 'MIXTA']).optional().nullable(),
  cuspp: z.string().max(40).optional().nullable(),
  regimenLaboral: RegimenLaboralEnum.optional(),
  tipoContrato: TipoContratoEnum.optional(),
  tipoAporte: TipoAporteEnum.optional(),
  status: WorkerStatusEnum.optional(),
  sueldoBruto: z.union([z.number(), z.string()]).optional(),
  asignacionFamiliar: z.boolean().optional(),
  jornadaSemanal: z.union([z.number(), z.string()]).optional(),
  tiempoCompleto: z.boolean().optional(),
  essaludVida: z.boolean().optional(),
  sctr: z.boolean().optional(),
  turnoNocturno: z.boolean().optional(),
  birthDate: fechaFlexible.optional().nullable().or(z.literal('')),
  fechaIngreso: fechaFlexible.optional(),
  fechaCese: fechaFlexible.optional().nullable().or(z.literal('')),
})

// ── POST /api/workers/[id]/vacaciones — Crea período (MUTA balance) ───────
//
// Aquí va la validación de días: el handler calcula diasPendientes a partir de
// diasCorresponden/diasGozados. Sin validar, un valor negativo/NaN corrompe el
// balance. diasCorresponden y diasGozados son opcionales (el handler tiene
// defaults), pero si vienen deben ser enteros >= 0. fechaGoce puede llegar
// undefined (el cliente manda `fechaGoce || undefined`).
export const vacacionCreateSchema = z.object({
  periodoInicio: fechaFlexible,
  periodoFin: fechaFlexible,
  diasCorresponden: z
    .number()
    .int('Los días deben ser un entero')
    .min(0, 'Los días no pueden ser negativos')
    .max(366, 'Días fuera de rango')
    .optional(),
  diasGozados: z
    .number()
    .int('Los días gozados deben ser un entero')
    .min(0, 'Los días gozados no pueden ser negativos')
    .max(366, 'Días gozados fuera de rango')
    .optional(),
  fechaGoce: fechaFlexible.optional().nullable(),
})

// ── POST /api/payslips/batch — Generación masiva de boletas ───────────────
//
// El cliente real solo manda { periodo }. workerIds es opcional pero, si viene,
// debe ser array de strings (hoy se pasa crudo a Prisma `{ id: { in } }`).
export const payslipBatchSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, 'El campo "periodo" debe tener formato YYYY-MM'),
  workerIds: z.array(z.string().min(1)).optional(),
})

export type WorkerCreateInput = z.infer<typeof workerCreateSchema>
export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>
export type VacacionCreateInput = z.infer<typeof vacacionCreateSchema>
export type PayslipBatchInput = z.infer<typeof payslipBatchSchema>
