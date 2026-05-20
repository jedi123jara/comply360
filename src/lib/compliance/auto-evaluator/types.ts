/**
 * Tipos del motor de auto-evaluación del Diagnóstico SUNAFIL.
 *
 * El motor cruza los datos del SaaS (Worker, Contract, Payslip, Attendance,
 * IPERCBase, ComiteSST, EMO, Complaint, CeseRecord, OrgDocument, etc.) y
 * produce una `AutoAnswer` por cada pregunta del diagnóstico cuya respuesta se
 * puede inferir deterministamente. Las preguntas con `answer = null` quedan
 * para el wizard manual.
 *
 * Cada evaluator es independiente; el registry los corre en paralelo (Promise.all).
 */

import type { Prisma } from '@/generated/prisma/client'

/** Respuesta posible a una pregunta del diagnóstico. */
export type AutoAnswerValue = 'SI' | 'NO' | 'PARCIAL'

/** Item de evidencia que se muestra en la card "Evidencia automática" del wizard. */
export interface Evidence {
  /** Tipo de evidencia — determina cómo se renderiza en UI. */
  type: 'worker' | 'document' | 'metric' | 'date' | 'amount' | 'link' | 'text'
  /** Label corto del item (ej. "Trabajadores sin contrato"). */
  label: string
  /** Valor mostrado (string formateado). */
  value: string
  /** Link clickeable opcional al detalle (ej. `/dashboard/trabajadores/{id}`). */
  href?: string
  /** Si es de tipo `worker`, el id del worker para deep-linking. */
  workerId?: string
  /** Workers afectados (ids) cuando aplica — útil para spawn de tareas. */
  affectedWorkerIds?: string[]
}

/** Resultado de un evaluator. */
export interface AutoAnswer {
  questionId: string
  /** null = no determinable → pregunta vuelve al wizard manual. */
  answer: AutoAnswerValue | null
  /**
   * 0-100. Si < 70 (DEFAULT_MIN_CONFIDENCE) la respuesta NO se aplica
   * automáticamente — la pregunta vuelve al wizard manual con la auto-answer
   * como sugerencia.
   */
  confidence: number
  evidence: Evidence[]
  /** Modelos/tablas Prisma que se consultaron. Útil para debugging. */
  sources: string[]
  /** Identificador del evaluator. Default = `questionId`. */
  evaluatorName?: string
}

/** Confianza mínima para auto-aplicar una respuesta sin pasar por el wizard manual. */
export const DEFAULT_MIN_CONFIDENCE = 70

/**
 * Datos precargados que reciben todos los evaluators. El context.ts hace UN
 * solo round-trip a la DB para cargar todo y luego los evaluators trabajan
 * en memoria — esto mantiene el prefill rápido aun con muchas preguntas.
 */
export interface EvaluatorContext {
  orgId: string
  now: Date
  organization: Pick<
    Prisma.OrganizationGetPayload<Record<string, never>>,
    | 'id'
    | 'name'
    | 'ruc'
    | 'sizeRange'
    | 'regimenPrincipal'
    | 'totalWorkersDeclared'
    | 'remypeRegistered'
    | 'sector'
  >
  /** Total de workers activos (ACTIVE + ON_LEAVE + SUSPENDED). */
  workerCount: number
  workers: WorkerForEvaluator[]
  contracts: ContractForEvaluator[]
  workerContracts: WorkerContractForEvaluator[]
  payslips: PayslipForEvaluator[]
  vacationRecords: VacationRecordForEvaluator[]
  attendanceRecent: AttendanceForEvaluator[]
  ceseRecords: CeseRecordForEvaluator[]
  workerDependents: WorkerDependentForEvaluator[]
  /** Documents organizacionales (políticas, RIT, etc.). */
  orgDocuments: OrgDocumentForEvaluator[]
  /** Documentos del legajo de cada worker. */
  workerDocuments: WorkerDocumentForEvaluator[]
  /** IPERC bases vigentes. */
  ipercBases: IpercBaseForEvaluator[]
  /** Comité SST vigente. */
  comiteSst: ComiteSstForEvaluator | null
  /** Exámenes médicos del año actual. */
  emoRecords: EmoForEvaluator[]
  /** Accidentes registrados. */
  accidentes: AccidenteForEvaluator[]
  /** Quejas/denuncias. */
  complaints: ComplaintForEvaluator[]
  /** SstRecords (políticas, planes, capacitaciones, etc.). */
  sstRecords: SstRecordForEvaluator[]
  /** Puestos de trabajo con exposiciones. */
  puestosTrabajo: PuestoTrabajoForEvaluator[]
  /** Terceros (tercerización + intermediación). */
  terceros: TerceroForEvaluator[]
}

/**
 * Interfaz de cada evaluator.
 *
 * Ejemplo de implementación:
 *
 * ```ts
 * export const evaluatorCR01: QuestionEvaluator = {
 *   questionId: 'CR-01',
 *   evaluate: async (ctx) => {
 *     const sinContrato = ctx.workers.filter(w => !hasActiveContract(ctx, w.id))
 *     return {
 *       questionId: 'CR-01',
 *       answer: sinContrato.length === 0 ? 'SI' : 'NO',
 *       confidence: 95,
 *       evidence: [...],
 *       sources: ['Worker', 'WorkerContract'],
 *     }
 *   },
 * }
 * ```
 */
export interface QuestionEvaluator {
  questionId: string
  /**
   * Devuelve la auto-respuesta o lanza si no puede determinar.
   * Si la lógica determina "no aplicable" para esta org, retornar
   * `{ answer: null, confidence: 100, ... }` para indicar "pregunta no aplica".
   */
  evaluate(ctx: EvaluatorContext): Promise<AutoAnswer> | AutoAnswer
}

// ─── Subtipos compactos para evitar payloads pesados ───────────────────

export interface WorkerForEvaluator {
  id: string
  dni: string
  firstName: string
  lastName: string
  status: string
  regimenLaboral: string
  tipoContrato: string
  tipoJornada: string | null
  fechaIngreso: Date
  fechaCese: Date | null
  motivoCese: string | null
  sueldoBruto: number
  asignacionFamiliar: boolean
  jornadaSemanal: number
  tiempoCompleto: boolean
  tipoAporte: string
  condicionEspecial: string | null
  discapacidad: boolean
  discapacidadCertificado: boolean
  nationality: string | null
  birthDate: Date | null
  sctr: boolean
  flagTRegistroPresentado: boolean
  flagTRegistroFecha: Date | null
  legajoScore: number | null
  gender: string | null
}

export interface ContractForEvaluator {
  id: string
  type: string
  status: string
  signedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
}

export interface WorkerContractForEvaluator {
  workerId: string
  contractId: string
}

export interface PayslipForEvaluator {
  id: string
  workerId: string
  periodo: string
  sueldoBruto: number
  asignacionFamiliar: number | null
  horasExtras: number | null
  bonificaciones: number | null
  totalIngresos: number
  aporteAfpOnp: number | null
  status: string
  acceptedAt: Date | null
  createdAt: Date
}

export interface VacationRecordForEvaluator {
  id: string
  workerId: string
  periodoInicio: Date
  periodoFin: Date
  diasCorresponden: number
  diasGozados: number
  diasPendientes: number
  fechaGoce: Date | null
  esDoble: boolean
}

export interface AttendanceForEvaluator {
  id: string
  workerId: string
  workDate: Date
  clockIn: Date | null
  clockOut: Date | null
  hoursWorked: number | null
  status: string
  isOvertime: boolean
  overtimeMinutes: number | null
}

export interface CeseRecordForEvaluator {
  id: string
  workerId: string
  tipoCese: string
  fechaInicioProceso: Date
  fechaCese: Date
  fechaCartaPreaviso: Date | null
  fechaLimiteDescargos: Date | null
  fechaCartaDespido: Date | null
  fechaPagoLiquidacion: Date | null
  indemnizacionMonto: number
  totalLiquidacion: number
  etapa: string
  detalleJson: unknown
}

export interface WorkerDependentForEvaluator {
  id: string
  workerId: string
  relacion: string
  birthDate: Date | null
  esBeneficiarioAsigFam: boolean
}

export interface OrgDocumentForEvaluator {
  id: string
  type: string
  title: string
  fileUrl: string | null
  publishedAt: Date | null
  validUntil: Date | null
  acknowledgmentRequired: boolean
}

export interface WorkerDocumentForEvaluator {
  id: string
  workerId: string
  category: string
  documentType: string
  status: string
  isRequired: boolean
  expiresAt: Date | null
  verifiedAt: Date | null
  verifiedBy: string | null
}

export interface IpercBaseForEvaluator {
  id: string
  estado: string
  version: number
  fechaAprobacion: Date | null
}

export interface ComiteSstForEvaluator {
  id: string
  estado: string
  mandatoInicio: Date | null
  mandatoFin: Date | null
  libroActasUrl: string | null
}

export interface EmoForEvaluator {
  id: string
  workerId: string
  tipoExamen: string
  fechaExamen: Date
  aptitud: string | null
  proximoExamenAntes: Date | null
}

export interface AccidenteForEvaluator {
  id: string
  tipo: string
  fechaHora: Date
  plazoLegalHoras: number | null
  satNumeroManual: string | null
}

export interface ComplaintForEvaluator {
  id: string
  type: string
  status: string
  receivedAt: Date | null
  resolvedAt: Date | null
  protectionMeasures: unknown
  timeline: {
    action: string
    description: string | null
    createdAt: Date
  }[]
}

export interface SstRecordForEvaluator {
  id: string
  type: string
  status: string
  dueDate: Date | null
  completedAt: Date | null
}

export interface PuestoTrabajoForEvaluator {
  id: string
  sedeId: string | null
  workerId: string | null
  exposicionFisica: boolean
  exposicionQuimica: boolean
  exposicionBiologica: boolean
  exposicionErgonomica: boolean
  exposicionPsicosocial: boolean
  requiereAlturas: boolean
  requiereEspacioConfinado: boolean
  requiereSCTR: boolean
}

export interface TerceroForEvaluator {
  id: string
  razonSocial: string
  ruc: string | null
  tipoServicio: string | null
  trabajadoresAsignados: number | null
  isActividadPrincipal: boolean
  contratoUrl: string | null
  fechaInicio: Date | null
  fechaFin: Date | null
  isActive: boolean
}
