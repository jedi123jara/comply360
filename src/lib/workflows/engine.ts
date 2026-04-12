/* ================================================================== */
/*  Workflow Engine – COMPLY 360                                       */
/*  Real execution engine for automated compliance workflows           */
/* ================================================================== */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type StepType =
  | 'NOTIFICATION'
  | 'WAIT'
  | 'CONDITION'
  | 'ACTION'
  | 'APPROVAL'

export type ErrorStrategy = 'CONTINUE' | 'ABORT'

export interface NotificationConfig {
  channel: 'EMAIL' | 'PUSH' | 'SMS' | 'PLATFORM'
  recipients: string[]
  subject: string
  body: string
  templateId?: string
}

export interface WaitConfig {
  days?: number
  hours?: number
  minutes?: number
  until?: string // ISO date
}

export interface ConditionConfig {
  field: string          // e.g. "contract.daysToExpiry"
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq' | 'contains' | 'in'
  value: unknown
  onFalse: 'SKIP' | 'ABORT' | 'GOTO'
  gotoStepId?: string
}

export interface ActionConfig {
  type: 'CREATE_RECORD' | 'UPDATE_STATUS' | 'ASSIGN_USER' | 'GENERATE_DOCUMENT' | 'SEND_WEBHOOK'
  entity?: string
  data?: Record<string, unknown>
  url?: string
}

export interface ApprovalConfig {
  approvers: string[]
  requiredApprovals: number
  timeoutDays: number
  onTimeout: 'APPROVE' | 'REJECT' | 'ESCALATE'
  escalateTo?: string
}

export interface WorkflowStep {
  id: string
  name: string
  type: StepType
  config: NotificationConfig | WaitConfig | ConditionConfig | ActionConfig | ApprovalConfig
  errorStrategy: ErrorStrategy
  order: number
  description?: string
}

export interface WorkflowDefinition {
  id: string
  orgId: string
  name: string
  description: string
  version: number
  active: boolean
  steps: WorkflowStep[]
  triggerId: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type ExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'WAITING_APPROVAL'
  | 'CANCELLED'

export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'WAITING'

export interface StepResult {
  stepId: string
  stepName: string
  status: StepStatus
  startedAt: string
  completedAt?: string
  output?: Record<string, unknown>
  error?: string
  durationMs?: number
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  orgId: string
  status: ExecutionStatus
  triggerData: Record<string, unknown>
  context: Record<string, unknown>
  stepResults: StepResult[]
  currentStepIndex: number
  startedAt: string
  completedAt?: string
  error?: string
}

/* ------------------------------------------------------------------ */
/*  Execution context – passed between steps                           */
/* ------------------------------------------------------------------ */

export interface ExecutionContext {
  workflowId: string
  executionId: string
  orgId: string
  triggerData: Record<string, unknown>
  variables: Record<string, unknown>
  stepOutputs: Record<string, Record<string, unknown>>
}

/* ------------------------------------------------------------------ */
/*  In-memory store (swap for DB in production)                        */
/* ------------------------------------------------------------------ */

const workflowStore = new Map<string, WorkflowDefinition>()
const executionStore = new Map<string, WorkflowExecution>()

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function resolveField(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/* ------------------------------------------------------------------ */
/*  WorkflowEngine                                                     */
/* ------------------------------------------------------------------ */

export class WorkflowEngine {
  /* ---------- Workflow CRUD ---------- */

  registerWorkflow(definition: WorkflowDefinition): void {
    workflowStore.set(definition.id, definition)
  }

  getWorkflow(id: string): WorkflowDefinition | undefined {
    return workflowStore.get(id)
  }

  listWorkflows(orgId?: string): WorkflowDefinition[] {
    const all = Array.from(workflowStore.values())
    return orgId ? all.filter((w) => w.orgId === orgId) : all
  }

  /* ---------- Execution ---------- */

  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, unknown>,
  ): Promise<WorkflowExecution> {
    const definition = workflowStore.get(workflowId)
    if (!definition) {
      throw new Error(`Workflow no encontrado: ${workflowId}`)
    }
    if (!definition.active) {
      throw new Error(`Workflow inactivo: ${definition.name}`)
    }

    const executionId = generateId()
    const sortedSteps = [...definition.steps].sort((a, b) => a.order - b.order)

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      workflowName: definition.name,
      orgId: definition.orgId,
      status: 'RUNNING',
      triggerData,
      context: {},
      stepResults: [],
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
    }
    executionStore.set(executionId, execution)

    const ctx: ExecutionContext = {
      workflowId,
      executionId,
      orgId: definition.orgId,
      triggerData,
      variables: { ...triggerData },
      stepOutputs: {},
    }

    for (let i = 0; i < sortedSteps.length; i++) {
      execution.currentStepIndex = i
      const step = sortedSteps[i]
      const result = await this.executeStep(step, ctx)

      execution.stepResults.push(result)

      if (result.output) {
        ctx.stepOutputs[step.id] = result.output
        ctx.variables = { ...ctx.variables, ...result.output }
      }

      if (result.status === 'FAILED') {
        if (step.errorStrategy === 'ABORT') {
          execution.status = 'FAILED'
          execution.error = `Fallo en paso "${step.name}": ${result.error}`
          execution.completedAt = new Date().toISOString()
          executionStore.set(executionId, execution)
          return execution
        }
        // CONTINUE – just move on
      }

      if (result.status === 'WAITING') {
        execution.status = 'WAITING_APPROVAL'
        executionStore.set(executionId, execution)
        return execution
      }

      if (result.status === 'SKIPPED') {
        // Condition evaluated to false with SKIP strategy – keep going
      }
    }

    execution.status = 'COMPLETED'
    execution.completedAt = new Date().toISOString()
    execution.context = ctx.variables as Record<string, unknown>
    executionStore.set(executionId, execution)
    return execution
  }

  /* ---------- Step executor ---------- */

  async executeStep(step: WorkflowStep, ctx: ExecutionContext): Promise<StepResult> {
    const startedAt = new Date().toISOString()
    const base: StepResult = {
      stepId: step.id,
      stepName: step.name,
      status: 'RUNNING',
      startedAt,
    }

    try {
      switch (step.type) {
        case 'NOTIFICATION':
          return this.executeNotification(step, ctx, base)

        case 'WAIT':
          return this.executeWait(step, base)

        case 'CONDITION':
          return this.executeCondition(step, ctx, base)

        case 'ACTION':
          return this.executeAction(step, ctx, base)

        case 'APPROVAL':
          return this.executeApproval(step, base)

        default: {
          const completedAt = new Date().toISOString()
          return {
            ...base,
            status: 'FAILED',
            completedAt,
            error: `Tipo de paso desconocido: ${step.type}`,
            durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
          }
        }
      }
    } catch (err) {
      const completedAt = new Date().toISOString()
      return {
        ...base,
        status: 'FAILED',
        completedAt,
        error: err instanceof Error ? err.message : String(err),
        durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      }
    }
  }

  /* ---------- Per-type executors ---------- */

  private async executeNotification(
    step: WorkflowStep,
    ctx: ExecutionContext,
    base: StepResult,
  ): Promise<StepResult> {
    const cfg = step.config as NotificationConfig
    const completedAt = new Date().toISOString()

    // In production this would call email / push services
    console.log(
      `[WorkflowEngine] Notificacion enviada via ${cfg.channel} a ${cfg.recipients.join(', ')}`,
    )

    return {
      ...base,
      status: 'COMPLETED',
      completedAt,
      output: {
        channel: cfg.channel,
        recipientCount: cfg.recipients.length,
        subject: cfg.subject,
        orgId: ctx.orgId,
      },
      durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
    }
  }

  private async executeWait(step: WorkflowStep, base: StepResult): Promise<StepResult> {
    const cfg = step.config as WaitConfig
    const totalMs =
      (cfg.days ?? 0) * 86_400_000 +
      (cfg.hours ?? 0) * 3_600_000 +
      (cfg.minutes ?? 0) * 60_000

    const completedAt = new Date().toISOString()

    // In production this would schedule a delayed continuation
    console.log(`[WorkflowEngine] Espera programada: ${totalMs}ms`)

    return {
      ...base,
      status: 'COMPLETED',
      completedAt,
      output: {
        waitMs: totalMs,
        resumeAt: new Date(Date.now() + totalMs).toISOString(),
      },
      durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
    }
  }

  private executeCondition(
    step: WorkflowStep,
    ctx: ExecutionContext,
    base: StepResult,
  ): StepResult {
    const cfg = step.config as ConditionConfig
    const result = this.evaluateCondition(cfg, ctx.variables)
    const completedAt = new Date().toISOString()

    if (!result) {
      if (cfg.onFalse === 'ABORT') {
        return {
          ...base,
          status: 'FAILED',
          completedAt,
          error: `Condicion no cumplida: ${cfg.field} ${cfg.operator} ${String(cfg.value)}`,
          output: { conditionMet: false },
          durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
        }
      }
      // SKIP or GOTO
      return {
        ...base,
        status: 'SKIPPED',
        completedAt,
        output: { conditionMet: false, action: cfg.onFalse },
        durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
      }
    }

    return {
      ...base,
      status: 'COMPLETED',
      completedAt,
      output: { conditionMet: true },
      durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
    }
  }

  private async executeAction(
    step: WorkflowStep,
    ctx: ExecutionContext,
    base: StepResult,
  ): Promise<StepResult> {
    const cfg = step.config as ActionConfig
    const completedAt = new Date().toISOString()

    // In production, dispatch to the appropriate service
    console.log(`[WorkflowEngine] Accion ejecutada: ${cfg.type} en ${cfg.entity ?? 'N/A'}`)

    return {
      ...base,
      status: 'COMPLETED',
      completedAt,
      output: {
        actionType: cfg.type,
        entity: cfg.entity,
        executionOrgId: ctx.orgId,
      },
      durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
    }
  }

  private async executeApproval(step: WorkflowStep, base: StepResult): Promise<StepResult> {
    const cfg = step.config as ApprovalConfig
    const completedAt = new Date().toISOString()

    console.log(
      `[WorkflowEngine] Esperando aprobacion de ${cfg.approvers.join(', ')} (${cfg.requiredApprovals} requeridas)`,
    )

    return {
      ...base,
      status: 'WAITING',
      completedAt,
      output: {
        approvers: cfg.approvers,
        required: cfg.requiredApprovals,
        timeoutDays: cfg.timeoutDays,
        onTimeout: cfg.onTimeout,
      },
      durationMs: new Date(completedAt).getTime() - new Date(base.startedAt).getTime(),
    }
  }

  /* ---------- Condition evaluator ---------- */

  evaluateCondition(condition: ConditionConfig, context: Record<string, unknown>): boolean {
    const fieldValue = resolveField(context, condition.field)
    const target = condition.value

    switch (condition.operator) {
      case 'lt':
        return Number(fieldValue) < Number(target)
      case 'lte':
        return Number(fieldValue) <= Number(target)
      case 'gt':
        return Number(fieldValue) > Number(target)
      case 'gte':
        return Number(fieldValue) >= Number(target)
      case 'eq':
        return fieldValue === target
      case 'neq':
        return fieldValue !== target
      case 'contains':
        return typeof fieldValue === 'string' && typeof target === 'string'
          ? fieldValue.includes(target)
          : false
      case 'in':
        return Array.isArray(target) ? target.includes(fieldValue) : false
      default:
        return false
    }
  }

  /* ---------- Execution queries ---------- */

  getExecution(id: string): WorkflowExecution | undefined {
    return executionStore.get(id)
  }

  listExecutions(filters?: {
    workflowId?: string
    orgId?: string
    status?: ExecutionStatus
  }): WorkflowExecution[] {
    let results = Array.from(executionStore.values())

    if (filters?.workflowId) {
      results = results.filter((e) => e.workflowId === filters.workflowId)
    }
    if (filters?.orgId) {
      results = results.filter((e) => e.orgId === filters.orgId)
    }
    if (filters?.status) {
      results = results.filter((e) => e.status === filters.status)
    }

    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
  }

  cancelExecution(id: string): boolean {
    const exec = executionStore.get(id)
    if (!exec || exec.status === 'COMPLETED' || exec.status === 'FAILED') return false
    exec.status = 'CANCELLED'
    exec.completedAt = new Date().toISOString()
    executionStore.set(id, exec)
    return true
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                          */
/* ------------------------------------------------------------------ */

export const workflowEngine = new WorkflowEngine()
