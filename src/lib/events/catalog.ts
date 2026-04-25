/**
 * Catálogo tipado de eventos del dominio COMPLY360.
 *
 * Es la fuente de verdad para:
 *  - Qué eventos puede emitir la aplicación
 *  - Qué campos tiene cada payload (Zod schemas)
 *  - Cómo extraer el `entityId` principal (para idempotencia)
 *  - Cómo mostrarlo en la UI de workflows
 *
 * Reutiliza y extiende `PREDEFINED_EVENTS` de `src/lib/workflows/triggers.ts`.
 * La diferencia: acá hay schemas Zod para validación y un entityExtractor por
 * evento que usa el workflow-handler para computar la idempotencyKey.
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════
// Payload base — todos los eventos llevan orgId para multi-tenancy
// ═══════════════════════════════════════════════════════════════════════════

const basePayload = z.object({
  orgId: z.string().min(1),
  userId: z.string().optional(),
  /**
   * Si este evento fue emitido por un workflow run, su ID viene acá. Sirve
   * al workflow-handler para cortar loops infinitos (max depth 3).
   */
  _emittedBy: z.array(z.string()).max(10).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════
// Schemas por evento
// ═══════════════════════════════════════════════════════════════════════════

const workerCreatedPayload = basePayload.extend({
  workerId: z.string(),
  workerName: z.string().optional(),
  position: z.string().optional(),
  regimenLaboral: z.string().optional(),
})

const workerUpdatedPayload = basePayload.extend({
  workerId: z.string(),
  fieldsChanged: z.array(z.string()).optional(),
})

const workerTerminatedPayload = basePayload.extend({
  workerId: z.string(),
  terminationDate: z.string(),
  reason: z.string().optional(),
})

const contractSignedPayload = basePayload.extend({
  contractId: z.string(),
  workerId: z.string().optional(),
  signedAt: z.string(),
  contractType: z.string().optional(),
  signatureLevel: z.enum(['SIMPLE', 'BIOMETRIC', 'CERTIFIED']).optional(),
})

const contractExpiringPayload = basePayload.extend({
  contractId: z.string(),
  daysToExpiry: z.number(),
  expiryDate: z.string(),
})

const contractExpiredPayload = basePayload.extend({
  contractId: z.string(),
  expiryDate: z.string(),
})

const documentUploadedPayload = basePayload.extend({
  documentId: z.string(),
  workerId: z.string(),
  documentType: z.string(),
  category: z.string(),
})

const documentExpiredPayload = basePayload.extend({
  documentId: z.string(),
  workerId: z.string(),
  documentType: z.string(),
  expiryDate: z.string(),
})

const alertResolvedPayload = basePayload.extend({
  alertId: z.string(),
  workerId: z.string().optional(),
  severity: z.string().optional(),
  type: z.string().optional(),
})

const diagnosticCompletedPayload = basePayload.extend({
  diagnosticId: z.string(),
  type: z.enum(['FULL', 'EXPRESS', 'SIMULATION']),
  scoreGlobal: z.number(),
})

const trainingCompletedPayload = basePayload.extend({
  enrollmentId: z.string(),
  workerId: z.string(),
  courseId: z.string(),
  courseCategory: z.string().optional(),
  score: z.number(),
})

const trainingDuePayload = basePayload.extend({
  enrollmentId: z.string(),
  workerId: z.string(),
  courseId: z.string(),
  dueDate: z.string(),
})

const sstSimulacroCompletedPayload = basePayload.extend({
  recordId: z.string(),
  type: z.string(),
  completedAt: z.string(),
})

const sstIncidentPayload = basePayload.extend({
  recordId: z.string(),
  severity: z.string().optional(),
  location: z.string().optional(),
})

const complaintReceivedPayload = basePayload.extend({
  complaintId: z.string(),
  type: z.enum(['HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL', 'OTRO']),
  anonymous: z.boolean(),
  receivedAt: z.string(),
})

const complaintTriagedPayload = basePayload.extend({
  complaintId: z.string(),
  severity: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']).nullable(),
  urgency: z.enum(['BAJA', 'MEDIA', 'ALTA', 'INMEDIATA']).nullable(),
})

const complianceScoreDropPayload = basePayload.extend({
  previousScore: z.number(),
  currentScore: z.number(),
  threshold: z.number(),
})

const inspectionScheduledPayload = basePayload.extend({
  inspectionId: z.string(),
  scheduledDate: z.string(),
  inspector: z.string().optional(),
})

const payslipAcceptedPayload = basePayload.extend({
  payslipId: z.string(),
  workerId: z.string(),
  periodo: z.string(),
  signatureLevel: z.enum(['SIMPLE', 'BIOMETRIC', 'CERTIFIED']).optional(),
})

const workerProfileUpdatedPayload = basePayload.extend({
  workerId: z.string(),
  fieldsChanged: z.array(z.string()).optional(),
})

const workerRequestCreatedPayload = basePayload.extend({
  requestId: z.string(),
  workerId: z.string(),
  type: z.string(),
  title: z.string().optional(),
})

const workerRequestCancelledPayload = basePayload.extend({
  requestId: z.string(),
  workerId: z.string(),
})

// ═══════════════════════════════════════════════════════════════════════════
// Registry — cada entrada: schema + entityExtractor + metadata para UI
// ═══════════════════════════════════════════════════════════════════════════

export interface EventDescriptor<S extends z.ZodType = z.ZodType> {
  schema: S
  /** Clave usada para idempotencia y logs (ej: 'workerId', 'contractId'). */
  entityKey: string
  /** Categoría UI. */
  category: 'Trabajadores' | 'Contratos' | 'Documentos' | 'Alertas' | 'Cumplimiento' | 'Capacitaciones' | 'SST' | 'Denuncias'
  /** Label humano para la UI de workflows. */
  label: string
  /** Descripción corta. */
  description: string
}

export const EVENT_CATALOG = {
  'worker.created': {
    schema: workerCreatedPayload,
    entityKey: 'workerId',
    category: 'Trabajadores',
    label: 'Trabajador registrado',
    description: 'Se dispara al dar de alta un nuevo trabajador.',
  },
  'worker.updated': {
    schema: workerUpdatedPayload,
    entityKey: 'workerId',
    category: 'Trabajadores',
    label: 'Trabajador actualizado',
    description: 'Se dispara cuando cambian datos de un trabajador.',
  },
  'worker.terminated': {
    schema: workerTerminatedPayload,
    entityKey: 'workerId',
    category: 'Trabajadores',
    label: 'Trabajador cesado',
    description: 'Se dispara al dar de baja un trabajador.',
  },
  'contract.signed': {
    schema: contractSignedPayload,
    entityKey: 'contractId',
    category: 'Contratos',
    label: 'Contrato firmado',
    description: 'Se dispara cuando un contrato pasa a estado SIGNED.',
  },
  'contract.expiring': {
    schema: contractExpiringPayload,
    entityKey: 'contractId',
    category: 'Contratos',
    label: 'Contrato por vencer',
    description: 'Se dispara cuando un contrato está próximo a vencer.',
  },
  'contract.expired': {
    schema: contractExpiredPayload,
    entityKey: 'contractId',
    category: 'Contratos',
    label: 'Contrato vencido',
    description: 'Se dispara cuando un contrato superó su fecha de vencimiento.',
  },
  'document.uploaded': {
    schema: documentUploadedPayload,
    entityKey: 'documentId',
    category: 'Documentos',
    label: 'Documento subido',
    description: 'Se dispara cuando se carga un documento al legajo.',
  },
  'document.expired': {
    schema: documentExpiredPayload,
    entityKey: 'documentId',
    category: 'Documentos',
    label: 'Documento vencido',
    description: 'Se dispara cuando un documento del legajo vence.',
  },
  'alert.resolved': {
    schema: alertResolvedPayload,
    entityKey: 'alertId',
    category: 'Alertas',
    label: 'Alerta resuelta',
    description: 'Se dispara cuando el admin marca una alerta como resuelta.',
  },
  'diagnostic.completed': {
    schema: diagnosticCompletedPayload,
    entityKey: 'diagnosticId',
    category: 'Cumplimiento',
    label: 'Diagnóstico completado',
    description: 'Se dispara cuando se completa un diagnóstico SUNAFIL.',
  },
  'training.completed': {
    schema: trainingCompletedPayload,
    entityKey: 'enrollmentId',
    category: 'Capacitaciones',
    label: 'Capacitación completada',
    description: 'Se dispara cuando un trabajador aprueba un examen.',
  },
  'training.due': {
    schema: trainingDuePayload,
    entityKey: 'enrollmentId',
    category: 'Capacitaciones',
    label: 'Capacitación pendiente',
    description: 'Se dispara cuando hay capacitaciones obligatorias sin completar.',
  },
  'sst.simulacro_completed': {
    schema: sstSimulacroCompletedPayload,
    entityKey: 'recordId',
    category: 'SST',
    label: 'Simulacro SST completado',
    description: 'Se dispara al completarse un simulacro de SUNAFIL.',
  },
  'sst.incident': {
    schema: sstIncidentPayload,
    entityKey: 'recordId',
    category: 'SST',
    label: 'Incidente SST',
    description: 'Se dispara cuando se registra un accidente o incidente SST.',
  },
  'complaint.received': {
    schema: complaintReceivedPayload,
    entityKey: 'complaintId',
    category: 'Denuncias',
    label: 'Denuncia recibida',
    description: 'Se dispara al registrar una denuncia en el canal Ley 27942.',
  },
  'complaint.triaged': {
    schema: complaintTriagedPayload,
    entityKey: 'complaintId',
    category: 'Denuncias',
    label: 'Denuncia triajeada por IA',
    description: 'Se dispara cuando la IA completa la clasificación de severidad.',
  },
  'compliance.score_drop': {
    schema: complianceScoreDropPayload,
    entityKey: 'orgId',
    category: 'Cumplimiento',
    label: 'Caída del score de compliance',
    description: 'Se dispara cuando el score baja de un umbral crítico.',
  },
  'inspection.scheduled': {
    schema: inspectionScheduledPayload,
    entityKey: 'inspectionId',
    category: 'Cumplimiento',
    label: 'Inspección programada',
    description: 'Se dispara al detectar una inspección SUNAFIL programada.',
  },
  'payslip.accepted': {
    schema: payslipAcceptedPayload,
    entityKey: 'payslipId',
    category: 'Documentos',
    label: 'Boleta aceptada',
    description: 'Se dispara cuando el trabajador acepta/firma una boleta de pago desde su portal.',
  },
  'worker.profile.updated': {
    schema: workerProfileUpdatedPayload,
    entityKey: 'workerId',
    category: 'Trabajadores',
    label: 'Perfil del trabajador actualizado',
    description: 'Se dispara cuando el trabajador actualiza sus datos personales desde /mi-portal/perfil.',
  },
  'worker_request.created': {
    schema: workerRequestCreatedPayload,
    entityKey: 'requestId',
    category: 'Trabajadores',
    label: 'Solicitud de trabajador creada',
    description: 'Se dispara cuando el trabajador crea una solicitud (vacaciones, permiso, certificado).',
  },
  'worker_request.cancelled': {
    schema: workerRequestCancelledPayload,
    entityKey: 'requestId',
    category: 'Trabajadores',
    label: 'Solicitud de trabajador cancelada',
    description: 'Se dispara cuando el trabajador cancela su propia solicitud.',
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Tipos derivados
// ═══════════════════════════════════════════════════════════════════════════

export type EventName = keyof typeof EVENT_CATALOG

export type EventPayloads = {
  [K in EventName]: z.infer<(typeof EVENT_CATALOG)[K]['schema']>
}

export interface DomainEvent<K extends EventName = EventName> {
  id: string
  name: K
  payload: EventPayloads[K]
  emittedAt: string
}

/**
 * Type-narrowed helper que obtiene el entityId del payload según el catálogo.
 * Devuelve string vacío si la key no está o no es string (nunca debería pasar
 * con payloads validados).
 */
export function getEntityId<K extends EventName>(event: DomainEvent<K>): string {
  const key = EVENT_CATALOG[event.name].entityKey
  const value = (event.payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

/**
 * Lista todos los nombres del catálogo. Útil para la UI de workflows.
 */
export function listEventNames(): EventName[] {
  return Object.keys(EVENT_CATALOG) as EventName[]
}

/**
 * Lista eventos agrupados por categoría, ordenados.
 */
export function listEventsByCategory(): Record<string, Array<{ name: EventName; label: string; description: string }>> {
  const grouped: Record<string, Array<{ name: EventName; label: string; description: string }>> = {}
  for (const [name, desc] of Object.entries(EVENT_CATALOG) as Array<[EventName, EventDescriptor]>) {
    const cat = desc.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ name, label: desc.label, description: desc.description })
  }
  return grouped
}
