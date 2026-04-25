/**
 * Capa de persistencia para workflows.
 *
 * Hace el bridge entre el engine en-memoria (`engine.ts`) y la DB (Prisma).
 * Todas las funciones filtran por `orgId` para multi-tenancy.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import {
  workflowEngine,
  type WorkflowDefinition,
  type WorkflowStep,
  type WorkflowExecution,
  type ExecutionStatus,
} from './engine'

// ─── Helpers de parseo ───────────────────────────────────────────────────────

function toDefinition(row: {
  id: string
  orgId: string
  name: string
  description: string | null
  version: number
  active: boolean
  triggerId: string
  stepsJson: Prisma.JsonValue
  metadata: Prisma.JsonValue | null
  createdAt: Date
  updatedAt: Date
}): WorkflowDefinition {
  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description ?? '',
    version: row.version,
    active: row.active,
    triggerId: row.triggerId,
    steps: (row.stepsJson as unknown as WorkflowStep[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
  }
}

// ─── CRUD Workflows ──────────────────────────────────────────────────────────

export async function listWorkflows(orgId: string) {
  const rows = await prisma.workflow.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toDefinition)
}

export async function getWorkflow(orgId: string, id: string) {
  const row = await prisma.workflow.findFirst({ where: { id, orgId } })
  return row ? toDefinition(row) : null
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  triggerId: string
  steps: WorkflowStep[]
  metadata?: Record<string, unknown>
  createdBy?: string
}

export async function createWorkflow(orgId: string, input: CreateWorkflowInput) {
  const row = await prisma.workflow.create({
    data: {
      orgId,
      name: input.name,
      description: input.description ?? null,
      triggerId: input.triggerId,
      stepsJson: input.steps as unknown as Prisma.InputJsonValue,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      createdBy: input.createdBy ?? null,
    },
  })
  return toDefinition(row)
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  active?: boolean
  steps?: WorkflowStep[]
}

export async function updateWorkflow(orgId: string, id: string, input: UpdateWorkflowInput) {
  // Check existence + orgId
  const existing = await prisma.workflow.findFirst({ where: { id, orgId } })
  if (!existing) return null

  const data: Prisma.WorkflowUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.active !== undefined) data.active = input.active
  if (input.steps !== undefined) {
    data.stepsJson = input.steps as unknown as Prisma.InputJsonValue
    data.version = { increment: 1 }
  }

  const updated = await prisma.workflow.update({ where: { id }, data })
  return toDefinition(updated)
}

export async function deleteWorkflow(orgId: string, id: string) {
  const existing = await prisma.workflow.findFirst({ where: { id, orgId } })
  if (!existing) return false
  await prisma.workflow.delete({ where: { id } })
  return true
}

// ─── Ejecución ──────────────────────────────────────────────────────────────

export interface RunWorkflowInput {
  orgId: string
  workflowId: string
  triggerData?: Record<string, unknown>
  triggeredBy?: string
}

/**
 * Carga la definición desde DB, la registra en el engine, ejecuta, y
 * persiste el resultado como WorkflowRun. Devuelve la ejecución + el ID del
 * WorkflowRun creado.
 */
export async function runWorkflow(input: RunWorkflowInput) {
  const def = await getWorkflow(input.orgId, input.workflowId)
  if (!def) throw new Error('Workflow no encontrado')
  if (!def.active) throw new Error('El workflow está desactivado')

  workflowEngine.registerWorkflow(def)
  const execution = await workflowEngine.executeWorkflow(
    def.id,
    input.triggerData ?? {},
  )

  const row = await prisma.workflowRun.create({
    data: {
      workflowId: def.id,
      orgId: input.orgId,
      status: execution.status,
      triggerData: execution.triggerData as Prisma.InputJsonValue,
      stepResultsJson: execution.stepResults as unknown as Prisma.InputJsonValue,
      context: (execution.context as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      currentStepIndex: execution.currentStepIndex,
      startedAt: new Date(execution.startedAt),
      completedAt: execution.completedAt ? new Date(execution.completedAt) : null,
      error: execution.error ?? null,
      triggeredBy: input.triggeredBy ?? null,
    },
  })

  return { execution, runId: row.id }
}

// ─── Historial de runs ──────────────────────────────────────────────────────

export async function listRuns(orgId: string, options?: { workflowId?: string; limit?: number }) {
  const where: Prisma.WorkflowRunWhereInput = { orgId }
  if (options?.workflowId) where.workflowId = options.workflowId

  return prisma.workflowRun.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: Math.min(options?.limit ?? 50, 200),
    include: {
      workflow: { select: { name: true } },
    },
  })
}

export function isExecutionStatus(s: string): s is ExecutionStatus {
  return [
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'PAUSED',
    'WAITING_APPROVAL',
    'CANCELLED',
  ].includes(s)
}

// Re-export útil para consumidores
export type { WorkflowDefinition, WorkflowStep, WorkflowExecution, ExecutionStatus }
