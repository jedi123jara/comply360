import { z } from 'zod'

// =============================================
// ENUMS (match Prisma schema exactly)
// =============================================

export const RegimenLaboral = z.enum([
  'GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO',
  'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION',
  'DOMESTICO', 'CAS', 'MODALIDAD_FORMATIVA', 'TELETRABAJO',
])

export const TipoContrato = z.enum([
  'INDEFINIDO', 'PLAZO_FIJO', 'TIEMPO_PARCIAL', 'INICIO_ACTIVIDAD',
  'NECESIDAD_MERCADO', 'RECONVERSION', 'SUPLENCIA', 'EMERGENCIA',
  'OBRA_DETERMINADA', 'INTERMITENTE', 'EXPORTACION',
])

export const TipoAporte = z.enum(['AFP', 'ONP', 'SIN_APORTE'])

export const WorkerStatus = z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'])

export const ContractType = z.enum([
  'LABORAL_INDEFINIDO', 'LABORAL_PLAZO_FIJO', 'LABORAL_TIEMPO_PARCIAL',
  'LOCACION_SERVICIOS', 'CONFIDENCIALIDAD', 'NO_COMPETENCIA',
  'POLITICA_HOSTIGAMIENTO', 'POLITICA_SST', 'REGLAMENTO_INTERNO',
  'ADDENDUM', 'CONVENIO_PRACTICAS', 'CUSTOM',
])

export const ContractStatus = z.enum([
  'DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED', 'ARCHIVED',
])

export const CalculationType = z.enum([
  'LIQUIDACION', 'CTS', 'GRATIFICACION', 'INDEMNIZACION',
  'HORAS_EXTRAS', 'VACACIONES', 'MULTA_SUNAFIL',
  'INTERESES_LEGALES', 'APORTES_PREVISIONALES', 'UTILIDADES',
])

export const DiagnosticType = z.enum(['FULL', 'EXPRESS', 'SIMULATION'])

export const ComplaintType = z.enum([
  'HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO',
])

export const ComplaintStatus = z.enum([
  'RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING',
  'PROTECTION_APPLIED', 'RESOLVED', 'DISMISSED',
])

export const AlertStatus = z.enum(['UNREAD', 'READ', 'DISMISSED'])

export const AlertSeverity = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])

export const UserRole = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

export const DocCategory = z.enum(['INGRESO', 'VIGENTE', 'SST', 'PREVISIONAL', 'CESE'])

export const SstRecordType = z.enum([
  'POLITICA_SST', 'IPERC', 'PLAN_ANUAL', 'CAPACITACION',
  'ACCIDENTE', 'INCIDENTE', 'EXAMEN_MEDICO', 'ENTREGA_EPP',
  'ACTA_COMITE', 'MAPA_RIESGOS', 'SIMULACRO_EVACUACION', 'MONITOREO_AGENTES',
])

// =============================================
// 1. WORKER SCHEMAS
// =============================================

export const createWorkerSchema = z.object({
  dni: z.string()
    .length(8, { message: 'El DNI debe tener exactamente 8 digitos' })
    .regex(/^\d+$/, { message: 'El DNI solo debe contener numeros' }),
  firstName: z.string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no puede exceder 100 caracteres' }),
  lastName: z.string()
    .min(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    .max(100, { message: 'El apellido no puede exceder 100 caracteres' }),
  email: z.string().email({ message: 'Email invalido' }).optional().nullable(),
  phone: z.string()
    .min(9, { message: 'El telefono debe tener al menos 9 digitos' })
    .max(15, { message: 'El telefono no puede exceder 15 caracteres' })
    .optional().nullable(),
  birthDate: z.string().datetime({ message: 'Fecha de nacimiento invalida' }).optional().nullable(),
  gender: z.enum(['M', 'F', 'OTRO'], { message: 'Genero invalido' }).optional(),
  nationality: z.string().max(50).optional().nullable(),
  address: z.string().max(500, { message: 'La direccion no puede exceder 500 caracteres' }).optional().nullable(),
  position: z.string()
    .min(2, { message: 'El cargo debe tener al menos 2 caracteres' })
    .max(100, { message: 'El cargo no puede exceder 100 caracteres' })
    .optional().nullable(),
  department: z.string()
    .min(2, { message: 'El area debe tener al menos 2 caracteres' })
    .max(100, { message: 'El area no puede exceder 100 caracteres' })
    .optional().nullable(),
  regimenLaboral: RegimenLaboral,
  tipoContrato: TipoContrato,
  fechaIngreso: z.string().datetime({ message: 'La fecha de ingreso es requerida y debe ser valida' }),
  fechaCese: z.string().datetime({ message: 'Fecha de cese invalida' }).optional().nullable(),
  motivoCese: z.string().max(500).optional().nullable(),
  sueldoBruto: z.number()
    .min(0, { message: 'El sueldo no puede ser negativo' })
    .max(999999, { message: 'El sueldo no puede exceder S/ 999,999' }),
  asignacionFamiliar: z.boolean().default(false),
  jornadaSemanal: z.number()
    .int({ message: 'La jornada debe ser un numero entero' })
    .min(1, { message: 'La jornada minima es 1 hora' })
    .max(48, { message: 'La jornada maxima legal es 48 horas semanales' })
    .default(48),
  tiempoCompleto: z.boolean().default(true),
  tipoAporte: TipoAporte,
  afpNombre: z.string().max(50).optional().nullable(),
  cuspp: z.string()
    .regex(/^[A-Z0-9]{12}$/, { message: 'CUSPP debe tener 12 caracteres alfanumericos' })
    .optional().nullable(),
  essaludVida: z.boolean().default(false),
  sctr: z.boolean().default(false),
})

export const updateWorkerSchema = createWorkerSchema.partial()

export const workerFilterSchema = z.object({
  status: WorkerStatus.optional(),
  regimenLaboral: RegimenLaboral.optional(),
  department: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// =============================================
// 2. CONTRACT SCHEMAS
// =============================================

export const createContractSchema = z.object({
  templateId: z.string().cuid({ message: 'ID de plantilla invalido' }).optional().nullable(),
  type: ContractType,
  title: z.string()
    .min(3, { message: 'El titulo debe tener al menos 3 caracteres' })
    .max(200, { message: 'El titulo no puede exceder 200 caracteres' }),
  formData: z.record(z.string(), z.unknown()).optional().nullable(),
  workerIds: z.array(z.string().cuid()).optional(),
  expiresAt: z.string().datetime({ message: 'Fecha de expiracion invalida' }).optional().nullable(),
})

export const updateContractSchema = z.object({
  status: ContractStatus.optional(),
  title: z.string().min(3).max(200).optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  contentHtml: z.string().max(500000, { message: 'El contenido excede el limite permitido' }).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export const contractFilterSchema = z.object({
  type: ContractType.optional(),
  status: ContractStatus.optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
})

// =============================================
// 3. CALCULATION SCHEMAS
// =============================================

const baseCalcFields = {
  sueldoBruto: z.number()
    .min(0, { message: 'El sueldo no puede ser negativo' })
    .max(999999, { message: 'Sueldo excede el maximo permitido' }),
  asignacionFamiliar: z.boolean().default(false),
  regimenLaboral: RegimenLaboral,
}

export const liquidacionInputSchema = z.object({
  ...baseCalcFields,
  fechaIngreso: z.string().datetime({ message: 'Fecha de ingreso invalida' }),
  fechaCese: z.string().datetime({ message: 'Fecha de cese invalida' }),
  motivoCese: z.string().min(1, { message: 'Debe indicar el motivo de cese' }),
  tipoContrato: TipoContrato,
  vacacionesPendientes: z.number().int().min(0).max(720).default(0),
  ctsPendiente: z.boolean().default(false),
  gratificacionProporcional: z.boolean().default(true),
})

export const ctsInputSchema = z.object({
  ...baseCalcFields,
  fechaIngreso: z.string().datetime({ message: 'Fecha de ingreso invalida' }),
  periodoInicio: z.string().datetime({ message: 'Fecha de inicio del periodo invalida' }),
  periodoFin: z.string().datetime({ message: 'Fecha de fin del periodo invalida' }),
  promedioComisiones: z.number().min(0).max(999999).default(0),
  promedioHorasExtras: z.number().min(0).max(999999).default(0),
})

export const gratificacionInputSchema = z.object({
  ...baseCalcFields,
  fechaIngreso: z.string().datetime({ message: 'Fecha de ingreso invalida' }),
  periodo: z.enum(['JULIO', 'DICIEMBRE'], { message: 'Periodo debe ser JULIO o DICIEMBRE' }),
  anio: z.number().int().min(2000).max(2100),
  diasEfectivos: z.number().int().min(0).max(180).optional(),
})

export const horasExtrasInputSchema = z.object({
  sueldoBruto: z.number().min(0).max(999999),
  jornadaDiaria: z.number().min(1).max(12).default(8),
  horasPrimeras: z.number().min(0).max(100, { message: 'Maximo 100 horas extras (primeras 2h)' }).default(0),
  horasRestantes: z.number().min(0).max(100, { message: 'Maximo 100 horas extras (excedentes)' }).default(0),
  esNocturno: z.boolean().default(false),
})

export const vacacionesInputSchema = z.object({
  ...baseCalcFields,
  fechaIngreso: z.string().datetime(),
  diasPendientes: z.number().int().min(1).max(60, { message: 'Maximo 60 dias de vacaciones acumuladas' }),
  esDoble: z.boolean().default(false),
})

export const multaSunafilInputSchema = z.object({
  tipoInfraccion: z.enum(['LEVE', 'GRAVE', 'MUY_GRAVE'], { message: 'Tipo de infraccion invalido' }),
  numTrabajadores: z.number().int()
    .min(1, { message: 'Debe tener al menos 1 trabajador' })
    .max(10000),
  regimenLaboral: RegimenLaboral,
  numInfracciones: z.number().int().min(1).max(100).default(1),
})

export const indemnizacionInputSchema = z.object({
  ...baseCalcFields,
  fechaIngreso: z.string().datetime(),
  fechaCese: z.string().datetime(),
  tipoContrato: TipoContrato,
  tipoDespido: z.enum(['ARBITRARIO', 'INCAUSADO', 'FRAUDULENTO'], {
    message: 'Tipo de despido invalido',
  }),
})

export const utilidadesInputSchema = z.object({
  rentaAnual: z.number().min(0, { message: 'La renta anual no puede ser negativa' }),
  sector: z.string().min(1, { message: 'Debe indicar el sector' }),
  diasTrabajados: z.number().int().min(1).max(365),
  remuneracion: z.number().min(0).max(999999),
  totalDiasTrabajadores: z.number().int().min(1),
  totalRemuneraciones: z.number().min(0),
})

export const calculationInputSchema = z.object({
  type: CalculationType,
  inputs: z.record(z.string(), z.unknown()),
  isPublic: z.boolean().default(false),
})

// =============================================
// 4. DIAGNOSTIC SCHEMAS
// =============================================

export const diagnosticAnswerSchema = z.object({
  questionId: z.string()
    .min(1, { message: 'El ID de la pregunta es requerido' }),
  answer: z.enum(['SI', 'PARCIAL', 'NO'], {
    message: 'La respuesta debe ser SI, PARCIAL o NO',
  }),
  comment: z.string().max(500).optional().nullable(),
})

export const submitDiagnosticSchema = z.object({
  type: DiagnosticType,
  answers: z.array(diagnosticAnswerSchema)
    .min(1, { message: 'Debe responder al menos una pregunta' })
    .max(150, { message: 'Maximo 150 respuestas por diagnostico' }),
  totalWorkers: z.number().int()
    .min(1, { message: 'Debe indicar al menos 1 trabajador' })
    .max(10000).optional(),
})

// =============================================
// 5. COMPLAINT SCHEMAS
// =============================================

export const createComplaintSchema = z.object({
  orgCode: z.string()
    .min(1, { message: 'El codigo de empresa es requerido' })
    .max(50),
  type: ComplaintType,
  isAnonymous: z.boolean().default(true),
  reporterName: z.string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(200).optional().nullable(),
  reporterEmail: z.string()
    .email({ message: 'Email del denunciante invalido' })
    .optional().nullable(),
  reporterPhone: z.string().max(20).optional().nullable(),
  accusedName: z.string().max(200).optional().nullable(),
  accusedPosition: z.string().max(200).optional().nullable(),
  description: z.string()
    .min(10, { message: 'La descripcion debe tener al menos 10 caracteres' })
    .max(5000, { message: 'La descripcion no puede exceder 5000 caracteres' }),
  evidenceUrls: z.array(z.string().url({ message: 'URL de evidencia invalida' }))
    .max(10, { message: 'Maximo 10 archivos de evidencia' })
    .default([]),
})

export const updateComplaintSchema = z.object({
  status: ComplaintStatus.optional(),
  assignedTo: z.string().cuid().optional().nullable(),
  resolution: z.string().max(5000).optional().nullable(),
  protectionMeasures: z.array(z.string()).optional().nullable(),
})

// =============================================
// 6. PORTAL EMPLEADO SCHEMAS
// =============================================

export const portalLoginSchema = z.object({
  dni: z.string()
    .length(8, { message: 'El DNI debe tener 8 digitos' })
    .regex(/^\d+$/, { message: 'El DNI solo debe contener numeros' }),
  companyCode: z.string()
    .min(1, { message: 'El codigo de empresa es requerido' })
    .max(50, { message: 'Codigo de empresa invalido' }),
})

export const portalDocumentRequestSchema = z.object({
  workerId: z.string().cuid(),
  documentType: z.enum([
    'BOLETA', 'CERTIFICADO_TRABAJO', 'CONSTANCIA_CTS',
    'CONSTANCIA_5TA', 'LIQUIDACION',
  ], { message: 'Tipo de documento no disponible' }),
  periodo: z.string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Periodo debe ser YYYY-MM' })
    .optional(),
})

// =============================================
// 7. AI CHAT SCHEMAS
// =============================================

export const aiChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
    .min(1, { message: 'El mensaje no puede estar vacio' })
    .max(10000, { message: 'El mensaje no puede exceder 10,000 caracteres' }),
})

export const aiChatSchema = z.object({
  message: z.string()
    .min(1, { message: 'El mensaje no puede estar vacio' })
    .max(2000, { message: 'El mensaje no puede exceder 2,000 caracteres' }),
  history: z.array(aiChatMessageSchema)
    .max(50, { message: 'El historial no puede exceder 50 mensajes' })
    .default([]),
  context: z.enum(['general', 'contratos', 'calculos', 'sst', 'sunafil']).optional(),
})

// =============================================
// 8. ALERT SCHEMAS
// =============================================

export const updateAlertSchema = z.object({
  status: AlertStatus,
})

export const bulkUpdateAlertsSchema = z.object({
  alertIds: z.array(z.string().cuid())
    .min(1, { message: 'Debe seleccionar al menos una alerta' })
    .max(100, { message: 'Maximo 100 alertas por operacion' }),
  status: AlertStatus,
})

export const alertFilterSchema = z.object({
  status: AlertStatus.optional(),
  severity: AlertSeverity.optional(),
  type: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
})

// =============================================
// 9. TEAM SCHEMAS
// =============================================

export const inviteMemberSchema = z.object({
  email: z.string()
    .email({ message: 'Email invalido' }),
  role: UserRole.refine((val) => val !== 'OWNER', {
    message: 'No se puede asignar el rol de propietario',
  }),
})

export const updateMemberRoleSchema = z.object({
  userId: z.string().cuid({ message: 'ID de usuario invalido' }),
  role: UserRole.refine((val) => val !== 'OWNER', {
    message: 'No se puede asignar el rol de propietario',
  }),
})

export const removeMemberSchema = z.object({
  userId: z.string().cuid({ message: 'ID de usuario invalido' }),
})

// =============================================
// 10. CONFIGURATION SCHEMAS
// =============================================

export const companyProfileSchema = z.object({
  name: z.string()
    .min(2, { message: 'El nombre de la empresa debe tener al menos 2 caracteres' })
    .max(200, { message: 'El nombre no puede exceder 200 caracteres' }),
  ruc: z.string()
    .length(11, { message: 'El RUC debe tener 11 digitos' })
    .regex(/^\d+$/, { message: 'El RUC solo debe contener numeros' })
    .optional().nullable(),
  razonSocial: z.string().max(200).optional().nullable(),
  sector: z.string().max(100).optional().nullable(),
  sizeRange: z.enum(['1-10', '11-50', '51-200', '200+'], {
    message: 'Rango de tamano invalido',
  }).optional().nullable(),
  regimenPrincipal: RegimenLaboral.optional().nullable(),
  logoUrl: z.string().url({ message: 'URL del logo invalida' }).optional().nullable(),
  alertEmail: z.string().email({ message: 'Email de alertas invalido' }).optional().nullable(),
})

export const notificationSettingsSchema = z.object({
  emailAlerts: z.boolean().default(true),
  alertTypes: z.object({
    contractExpiry: z.boolean().default(true),
    documentExpiry: z.boolean().default(true),
    ctsPending: z.boolean().default(true),
    gratificacionPending: z.boolean().default(true),
    vacationAccumulated: z.boolean().default(true),
    normUpdates: z.boolean().default(true),
    sunafilAlerts: z.boolean().default(true),
  }),
  digestFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'NONE'], {
    message: 'Frecuencia de resumen invalida',
  }).default('WEEKLY'),
  alertEmail: z.string().email({ message: 'Email invalido' }).optional().nullable(),
})

// =============================================
// HELPER TYPES (inferred from schemas)
// =============================================

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>
export type WorkerFilter = z.infer<typeof workerFilterSchema>
export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type LiquidacionInput = z.infer<typeof liquidacionInputSchema>
export type CtsInput = z.infer<typeof ctsInputSchema>
export type GratificacionInput = z.infer<typeof gratificacionInputSchema>
export type HorasExtrasInput = z.infer<typeof horasExtrasInputSchema>
export type VacacionesInput = z.infer<typeof vacacionesInputSchema>
export type MultaSunafilInput = z.infer<typeof multaSunafilInputSchema>
export type IndemnizacionInput = z.infer<typeof indemnizacionInputSchema>
export type UtilidadesInput = z.infer<typeof utilidadesInputSchema>
export type SubmitDiagnosticInput = z.infer<typeof submitDiagnosticSchema>
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>
export type PortalLoginInput = z.infer<typeof portalLoginSchema>
export type AiChatInput = z.infer<typeof aiChatSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type CompanyProfileInput = z.infer<typeof companyProfileSchema>
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>
