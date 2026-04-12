import { z } from 'zod'

// ===== WORKER =====
export const createWorkerSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 digitos'),
  firstName: z.string().min(1, 'Nombre requerido').max(100),
  lastName: z.string().min(1, 'Apellido requerido').max(100),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
  nationality: z.string().optional(),
  address: z.string().max(500).optional().or(z.literal('')),
  position: z.string().max(200).optional().or(z.literal('')),
  department: z.string().max(200).optional().or(z.literal('')),
  regimenLaboral: z.string().min(1),
  tipoContrato: z.string().min(1),
  fechaIngreso: z.string().min(1, 'Fecha de ingreso requerida'),
  fechaCese: z.string().optional().or(z.literal('')),
  motivoCese: z.string().optional().or(z.literal('')),
  sueldoBruto: z.number().min(0, 'Sueldo debe ser positivo'),
  asignacionFamiliar: z.boolean().optional(),
  jornadaSemanal: z.number().min(1).max(48).optional(),
  tiempoCompleto: z.boolean().optional(),
  tipoAporte: z.string().optional(),
  afpNombre: z.string().optional().or(z.literal('')),
  cuspp: z.string().optional().or(z.literal('')),
  essaludVida: z.boolean().optional(),
  sctr: z.boolean().optional(),
})

// ===== COMPLAINT =====
export const createComplaintSchema = z.object({
  orgId: z.string().min(1),
  type: z.enum(['HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO']),
  isAnonymous: z.boolean().optional(),
  reporterName: z.string().max(200).optional().or(z.literal('')),
  reporterEmail: z.string().email().optional().or(z.literal('')),
  reporterPhone: z.string().max(20).optional().or(z.literal('')),
  accusedName: z.string().max(200).optional().or(z.literal('')),
  accusedPosition: z.string().max(200).optional().or(z.literal('')),
  description: z.string().min(10, 'La descripcion debe tener al menos 10 caracteres').max(5000),
})

// ===== DIAGNOSTIC =====
export const submitDiagnosticSchema = z.object({
  type: z.enum(['FULL', 'EXPRESS', 'SIMULATION']),
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.enum(['SI', 'PARCIAL', 'NO']),
  })),
  totalWorkers: z.number().min(1).optional(),
})

// ===== SST =====
export const createSstRecordSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
})

// ===== COURSES =====
export const enrollWorkersSchema = z.object({
  courseId: z.string().min(1),
  workerIds: z.array(z.string()).min(1),
})

export const submitExamSchema = z.object({
  workerId: z.string().min(1),
  answers: z.record(z.string(), z.number()),
})

// ===== ONBOARDING =====
export const onboardingSchema = z.object({
  step: z.number().min(0).max(4),
  companyName: z.string().min(1).max(200).optional(),
  ruc: z.string().regex(/^\d{11}$/, 'RUC debe tener 11 digitos').optional(),
  sector: z.string().optional(),
  sizeRange: z.string().optional(),
  regimenPrincipal: z.string().optional(),
  alertEmail: z.string().email().optional().or(z.literal('')),
  razonSocial: z.string().optional(),
})

// ===== INTEGRATIONS =====
export const integrationExportSchema = z.object({
  action: z.enum(['t-registro', 'plame']),
  format: z.enum(['txt', 'csv']).optional(),
  periodo: z.string().optional(),
})

// ===== AI CHAT =====
export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})
