/* ================================================================== */
/*  Workflow Triggers – COMPLY 360                                     */
/*  Trigger matching system for automated workflow execution           */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TriggerType = 'SCHEDULED' | 'EVENT' | 'MANUAL'

export interface ScheduledConfig {
  cron: string           // e.g. "0 8 * * 1" (every Monday at 8am)
  timezone: string       // e.g. "America/Lima"
  description: string
}

export interface EventConfig {
  eventName: string      // e.g. "worker.created", "contract.expiring"
  filters?: Record<string, unknown>  // optional field filters
}

export interface ManualConfig {
  label: string
  requiredFields?: string[]
}

export interface WorkflowTrigger {
  id: string
  workflowId: string
  orgId: string
  type: TriggerType
  config: ScheduledConfig | EventConfig | ManualConfig
  active: boolean
  name: string
  description: string
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Pre-built event definitions                                        */
/* ------------------------------------------------------------------ */

export interface EventDefinition {
  name: string
  label: string
  description: string
  category: string
  payloadFields: string[]
}

export const PREDEFINED_EVENTS: EventDefinition[] = [
  {
    name: 'worker.created',
    label: 'Trabajador Registrado',
    description: 'Se dispara cuando se da de alta un nuevo trabajador en el sistema.',
    category: 'Trabajadores',
    payloadFields: ['workerId', 'workerName', 'department', 'position', 'startDate'],
  },
  {
    name: 'worker.terminated',
    label: 'Trabajador Cesado',
    description: 'Se dispara cuando un trabajador es dado de baja.',
    category: 'Trabajadores',
    payloadFields: ['workerId', 'workerName', 'terminationDate', 'reason'],
  },
  {
    name: 'contract.expiring',
    label: 'Contrato por Vencer',
    description: 'Se dispara cuando un contrato esta proximo a vencer (configurable).',
    category: 'Contratos',
    payloadFields: ['contractId', 'workerName', 'expiryDate', 'daysToExpiry', 'contractType'],
  },
  {
    name: 'contract.expired',
    label: 'Contrato Vencido',
    description: 'Se dispara cuando un contrato ha superado su fecha de vencimiento.',
    category: 'Contratos',
    payloadFields: ['contractId', 'workerName', 'expiryDate', 'contractType'],
  },
  {
    name: 'contract.signed',
    label: 'Contrato Firmado',
    description: 'Se dispara cuando un contrato es firmado digitalmente.',
    category: 'Contratos',
    payloadFields: ['contractId', 'workerName', 'signedAt', 'contractType'],
  },
  {
    name: 'inspection.scheduled',
    label: 'Inspeccion Programada',
    description: 'Se dispara cuando se detecta o registra una inspeccion de SUNAFIL.',
    category: 'Cumplimiento',
    payloadFields: ['inspectionId', 'scheduledDate', 'inspector', 'type'],
  },
  {
    name: 'complaint.received',
    label: 'Denuncia Recibida',
    description: 'Se dispara cuando se registra una nueva denuncia en el canal interno.',
    category: 'Denuncias',
    payloadFields: ['complaintId', 'category', 'severity', 'anonymous', 'receivedAt'],
  },
  {
    name: 'training.due',
    label: 'Capacitacion Pendiente',
    description: 'Se dispara cuando un trabajador tiene capacitaciones obligatorias pendientes.',
    category: 'Capacitaciones',
    payloadFields: ['workerId', 'workerName', 'courseId', 'courseName', 'dueDate'],
  },
  {
    name: 'training.completed',
    label: 'Capacitacion Completada',
    description: 'Se dispara cuando un trabajador completa una capacitacion.',
    category: 'Capacitaciones',
    payloadFields: ['workerId', 'workerName', 'courseId', 'courseName', 'score', 'completedAt'],
  },
  {
    name: 'document.expired',
    label: 'Documento Vencido',
    description: 'Se dispara cuando un documento obligatorio ha vencido (SCTR, EMOs, etc).',
    category: 'Documentos',
    payloadFields: ['documentId', 'documentType', 'expiryDate', 'workerId'],
  },
  {
    name: 'compliance.score_drop',
    label: 'Caida de Puntaje de Cumplimiento',
    description: 'Se dispara cuando el puntaje de cumplimiento cae por debajo de un umbral.',
    category: 'Cumplimiento',
    payloadFields: ['orgId', 'previousScore', 'currentScore', 'threshold'],
  },
  {
    name: 'sst.incident',
    label: 'Incidente SST Registrado',
    description: 'Se dispara cuando se registra un incidente de seguridad y salud en el trabajo.',
    category: 'SST',
    payloadFields: ['incidentId', 'type', 'severity', 'location', 'reportedAt'],
  },
]

/* ------------------------------------------------------------------ */
/*  Pre-built cron schedules                                           */
/* ------------------------------------------------------------------ */

export interface CronPreset {
  id: string
  label: string
  cron: string
  description: string
}

export const CRON_PRESETS: CronPreset[] = [
  { id: 'daily-8am', label: 'Diario a las 8:00', cron: '0 8 * * *', description: 'Todos los dias a las 8:00 AM' },
  { id: 'weekly-monday', label: 'Lunes a las 8:00', cron: '0 8 * * 1', description: 'Cada lunes a las 8:00 AM' },
  { id: 'biweekly', label: 'Quincenal', cron: '0 8 1,15 * *', description: 'Dias 1 y 15 de cada mes' },
  { id: 'monthly-first', label: 'Primer dia del mes', cron: '0 8 1 * *', description: 'Primer dia de cada mes a las 8:00 AM' },
  { id: 'monthly-last', label: 'Ultimo dia del mes', cron: '0 8 28-31 * *', description: 'Ultimo dia laboral de cada mes' },
  { id: 'quarterly', label: 'Trimestral', cron: '0 8 1 1,4,7,10 *', description: 'Primer dia de cada trimestre' },
  { id: 'yearly', label: 'Anual', cron: '0 8 1 1 *', description: 'Primer dia de enero' },
]

/* ------------------------------------------------------------------ */
/*  In-memory trigger store                                            */
/* ------------------------------------------------------------------ */

const triggerStore = new Map<string, WorkflowTrigger>()

/* ------------------------------------------------------------------ */
/*  Trigger management                                                 */
/* ------------------------------------------------------------------ */

export function registerTrigger(trigger: WorkflowTrigger): void {
  triggerStore.set(trigger.id, trigger)
}

export function removeTrigger(id: string): boolean {
  return triggerStore.delete(id)
}

export function getTrigger(id: string): WorkflowTrigger | undefined {
  return triggerStore.get(id)
}

export function listTriggers(orgId?: string): WorkflowTrigger[] {
  const all = Array.from(triggerStore.values())
  return orgId ? all.filter((t) => t.orgId === orgId) : all
}

/* ------------------------------------------------------------------ */
/*  matchTriggers – Find workflows that should fire for an event       */
/* ------------------------------------------------------------------ */

export function matchTriggers(
  event: { name: string; payload: Record<string, unknown> },
  orgId: string,
): WorkflowTrigger[] {
  const triggers = Array.from(triggerStore.values())

  return triggers.filter((trigger) => {
    // Must belong to the org and be active
    if (trigger.orgId !== orgId || !trigger.active) return false

    // Only event triggers match events
    if (trigger.type !== 'EVENT') return false

    const cfg = trigger.config as EventConfig
    if (cfg.eventName !== event.name) return false

    // Check optional filters
    if (cfg.filters) {
      for (const [key, expectedValue] of Object.entries(cfg.filters)) {
        const actual = event.payload[key]
        if (actual !== expectedValue) return false
      }
    }

    return true
  })
}

/* ------------------------------------------------------------------ */
/*  matchScheduledTriggers – Find scheduled triggers that should fire  */
/* ------------------------------------------------------------------ */

export function matchScheduledTriggers(currentDate: Date): WorkflowTrigger[] {
  const triggers = Array.from(triggerStore.values())

  return triggers.filter((trigger) => {
    if (!trigger.active || trigger.type !== 'SCHEDULED') return false

    const cfg = trigger.config as ScheduledConfig
    return matchesCron(cfg.cron, currentDate)
  })
}

/* ------------------------------------------------------------------ */
/*  Simple cron matcher (minute hour dom month dow)                     */
/* ------------------------------------------------------------------ */

function matchesCron(cron: string, date: Date): boolean {
  const parts = cron.split(/\s+/)
  if (parts.length !== 5) return false

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts
  const checks: [string, number][] = [
    [minPart, date.getMinutes()],
    [hourPart, date.getHours()],
    [domPart, date.getDate()],
    [monthPart, date.getMonth() + 1],
    [dowPart, date.getDay()],
  ]

  return checks.every(([pattern, value]) => matchCronField(pattern, value))
}

function matchCronField(pattern: string, value: number): boolean {
  if (pattern === '*') return true

  // Handle comma-separated values: "1,15"
  if (pattern.includes(',')) {
    return pattern.split(',').some((p) => matchCronField(p.trim(), value))
  }

  // Handle ranges: "28-31"
  if (pattern.includes('-')) {
    const [minStr, maxStr] = pattern.split('-')
    const min = parseInt(minStr, 10)
    const max = parseInt(maxStr, 10)
    return value >= min && value <= max
  }

  // Handle step: "*/5"
  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.slice(2), 10)
    return value % step === 0
  }

  return parseInt(pattern, 10) === value
}

/* ------------------------------------------------------------------ */
/*  getEventDefinitions – List available event definitions              */
/* ------------------------------------------------------------------ */

export function getEventDefinitions(category?: string): EventDefinition[] {
  if (category) {
    return PREDEFINED_EVENTS.filter((e) => e.category === category)
  }
  return PREDEFINED_EVENTS
}

export function getEventCategories(): string[] {
  return [...new Set(PREDEFINED_EVENTS.map((e) => e.category))]
}
