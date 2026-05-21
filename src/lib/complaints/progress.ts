import type {
  ComplaintDocumentKind,
  ComplaintRegime,
  ComplaintStage,
  ComplaintStatus,
} from '@/generated/prisma/client'

export type ComplaintProgressStatus = 'DONE' | 'ACTIVE' | 'PENDING'

export interface ComplaintProgressDocument {
  id: string
  title: string
  stage: ComplaintStage
  kind: ComplaintDocumentKind
  createdAt: Date | string
  downloadUrl?: string
  mimeType?: string | null
  size?: number | null
  hashSha256?: string | null
}

export interface ComplaintProgressStep {
  stage: ComplaintStage
  label: string
  description: string
  status: ComplaintProgressStatus
  completedAt: string | null
  documents: ComplaintProgressDocument[]
}

interface ProgressInput {
  regime: ComplaintRegime
  status: ComplaintStatus
  updatedAt?: Date | string | null
  resolvedAt?: Date | string | null
  timeline?: Array<{ action: string; createdAt: Date | string }>
  documents?: ComplaintProgressDocument[]
}

const STAGE_COPY: Record<ComplaintRegime, Array<{ stage: ComplaintStage; label: string; description: string }>> = {
  HSL: [
    { stage: 'RECEPCION', label: 'Recepcion de queja', description: 'El caso fue registrado en el canal y se genero un codigo de seguimiento.' },
    { stage: 'EVALUACION', label: 'Evaluacion inicial', description: 'RR. HH. o el responsable revisa competencia, urgencia y ruta legal.' },
    { stage: 'MEDIDAS_PROTECCION', label: 'Medidas de proteccion', description: 'Se documenta la atencion y las medidas para proteger a la persona afectada.' },
    { stage: 'INVESTIGACION', label: 'Investigacion', description: 'El Comite o Delegado recaba descargos, evidencia y testimonios.' },
    { stage: 'INFORME_COMITE', label: 'Informe del Comite', description: 'Se emite el informe con hechos, pruebas, conclusiones y recomendacion.' },
    { stage: 'DECISION_FINAL', label: 'Decision final', description: 'El organo sancionador registra la decision o archivo del caso.' },
    { stage: 'COMUNICACION_AUTORIDAD', label: 'Comunicacion a autoridad', description: 'Se deja constancia de la comunicacion al MTPE u otra autoridad cuando corresponde.' },
    { stage: 'CIERRE', label: 'Cierre documentado', description: 'El expediente queda cerrado con trazabilidad y documentos de respaldo.' },
  ],
  SST: [
    { stage: 'RECEPCION', label: 'Reporte recibido', description: 'El accidente, incidente, enfermedad o condicion insegura fue registrado.' },
    { stage: 'EVALUACION', label: 'Atencion y aseguramiento', description: 'Se documenta atencion inmediata, preservacion de escena y responsables.' },
    { stage: 'COMUNICACION_AUTORIDAD', label: 'Notificacion externa', description: 'Se registra la constancia SAT/MTPE/SUNAFIL cuando el caso lo exige.' },
    { stage: 'INVESTIGACION', label: 'Investigacion SST', description: 'Comite o Supervisor SST identifica causas, evidencia y medidas correctivas.' },
    { stage: 'INFORME_COMITE', label: 'Informe de investigacion', description: 'Se adjunta informe con causas inmediatas, basicas y acciones.' },
    { stage: 'DECISION_FINAL', label: 'Medidas correctivas', description: 'La empresa registra acciones, responsables, plazos y cierre de cumplimiento.' },
    { stage: 'CIERRE', label: 'Registro cerrado', description: 'El expediente queda archivado con los plazos de conservacion aplicables.' },
  ],
  MPD: [
    { stage: 'RECEPCION', label: 'Denuncia recibida', description: 'El canal MPD registro la alerta y preservo confidencialidad.' },
    { stage: 'EVALUACION', label: 'Triaje y admisibilidad', description: 'El Encargado de Prevencion evalua competencia, riesgo y conflicto de interes.' },
    { stage: 'INVESTIGACION', label: 'Investigacion interna', description: 'Se ejecuta el plan de investigacion, entrevistas y revision documental.' },
    { stage: 'INFORME_COMITE', label: 'Informe de investigacion', description: 'Se documentan hallazgos, calificacion y recomendaciones.' },
    { stage: 'DECISION_FINAL', label: 'Decision y consecuencias', description: 'Se registra decision disciplinaria, remediacion o archivo.' },
    { stage: 'COMUNICACION_AUTORIDAD', label: 'Derivacion externa', description: 'Se documenta comunicacion a Fiscalia, SMV u otra autoridad si corresponde.' },
    { stage: 'CIERRE', label: 'Cierre y lecciones aprendidas', description: 'El expediente queda cerrado y listo para auditoria.' },
  ],
}

const STATUS_ACTIVE_STAGE: Record<ComplaintStatus, ComplaintStage> = {
  RECEIVED: 'RECEPCION',
  UNDER_REVIEW: 'EVALUACION',
  INVESTIGATING: 'INVESTIGACION',
  PROTECTION_APPLIED: 'MEDIDAS_PROTECCION',
  RESOLVED: 'CIERRE',
  DISMISSED: 'CIERRE',
}

const ACTION_STAGE_HINTS: Array<{ pattern: string; stage: ComplaintStage }> = [
  { pattern: 'RECEIVED', stage: 'RECEPCION' },
  { pattern: 'RECIBIDA', stage: 'RECEPCION' },
  { pattern: 'EVALUACION', stage: 'EVALUACION' },
  { pattern: 'PROTECCION', stage: 'MEDIDAS_PROTECCION' },
  { pattern: 'INVESTIGACION', stage: 'INVESTIGACION' },
  { pattern: 'INFORME', stage: 'INFORME_COMITE' },
  { pattern: 'RESUELTA', stage: 'DECISION_FINAL' },
  { pattern: 'RESOLUTION', stage: 'DECISION_FINAL' },
  { pattern: 'DESESTIMADA', stage: 'DECISION_FINAL' },
  { pattern: 'MTPE', stage: 'COMUNICACION_AUTORIDAD' },
  { pattern: 'SUNAFIL', stage: 'COMUNICACION_AUTORIDAD' },
  { pattern: 'SAT', stage: 'COMUNICACION_AUTORIDAD' },
]

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function buildComplaintProgress(input: ProgressInput): ComplaintProgressStep[] {
  const stages = STAGE_COPY[input.regime]
  const activeStage = STATUS_ACTIVE_STAGE[input.status] ?? 'RECEPCION'
  const stageIndex = new Map(stages.map((stage, index) => [stage.stage, index]))
  const activeIndex = stageIndex.get(activeStage) ?? 0
  const documents = input.documents ?? []
  const documentedStages = new Map<ComplaintStage, ComplaintProgressDocument[]>()

  for (const document of documents) {
    const current = documentedStages.get(document.stage) ?? []
    current.push(document)
    documentedStages.set(document.stage, current)
  }

  const actionDates = new Map<ComplaintStage, string>()
  for (const entry of input.timeline ?? []) {
    const normalized = entry.action.toUpperCase()
    const hint = ACTION_STAGE_HINTS.find((candidate) => normalized.includes(candidate.pattern))
    if (hint && !actionDates.has(hint.stage)) {
      actionDates.set(hint.stage, iso(entry.createdAt) ?? '')
    }
  }

  return stages.map((stage, index) => {
    const stageDocuments = documentedStages.get(stage.stage) ?? []
    const hasDocument = stageDocuments.length > 0
    const timelineDate = actionDates.get(stage.stage) || null
    const isTerminal = input.status === 'RESOLVED' || input.status === 'DISMISSED'
    const status: ComplaintProgressStatus = index === activeIndex && !hasDocument
      ? 'ACTIVE'
      : hasDocument || Boolean(timelineDate) || (!isTerminal && index < activeIndex)
        ? 'DONE'
        : 'PENDING'

    const completedAt = status === 'DONE'
      ? iso(stageDocuments[0]?.createdAt) ?? timelineDate ?? iso(input.resolvedAt) ?? iso(input.updatedAt)
      : null

    return {
      ...stage,
      status,
      completedAt,
      documents: stageDocuments,
    }
  })
}
