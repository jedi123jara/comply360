/* ================================================================== */
/*  POST /api/workflows/execute  – Manually trigger a workflow         */
/*  GET  /api/workflows/execute  – List workflow executions            */
/* ================================================================== */

import { NextRequest, NextResponse } from 'next/server'
import {
  workflowEngine,
  type WorkflowDefinition,
  type WorkflowStep,
  type ExecutionStatus,
} from '@/lib/workflows/engine'
import { matchTriggers, registerTrigger, type WorkflowTrigger } from '@/lib/workflows/triggers'

/* ------------------------------------------------------------------ */
/*  Seed demo workflows on first request                               */
/* ------------------------------------------------------------------ */

let seeded = false

function seedDemoData(): void {
  if (seeded) return
  seeded = true

  const demoOrgId = 'org-demo-001'

  const contractExpiryWorkflow: WorkflowDefinition = {
    id: 'wf-contrato-vencer',
    orgId: demoOrgId,
    name: 'Contrato por Vencer',
    description: 'Notifica y genera borrador de renovacion antes del vencimiento.',
    version: 1,
    active: true,
    triggerId: 'trigger-contract-expiring',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-20T08:00:00Z',
    steps: [
      {
        id: 'step-1',
        name: 'Verificar dias para vencimiento',
        type: 'CONDITION',
        order: 1,
        errorStrategy: 'ABORT',
        config: {
          field: 'contract.daysToExpiry',
          operator: 'lte',
          value: 30,
          onFalse: 'SKIP',
        },
      },
      {
        id: 'step-2',
        name: 'Notificar a RRHH',
        type: 'NOTIFICATION',
        order: 2,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: ['rrhh@empresa.com'],
          subject: 'Contrato proximo a vencer',
          body: 'El contrato del trabajador esta por vencer en los proximos 30 dias.',
        },
      },
      {
        id: 'step-3',
        name: 'Esperar 1 dia',
        type: 'WAIT',
        order: 3,
        errorStrategy: 'CONTINUE',
        config: { days: 1 },
      },
      {
        id: 'step-4',
        name: 'Generar borrador de renovacion',
        type: 'ACTION',
        order: 4,
        errorStrategy: 'ABORT',
        config: {
          type: 'GENERATE_DOCUMENT',
          entity: 'contract',
          data: { template: 'renovacion-laboral' },
        },
      },
      {
        id: 'step-5',
        name: 'Solicitar aprobacion de gerencia',
        type: 'APPROVAL',
        order: 5,
        errorStrategy: 'ABORT',
        config: {
          approvers: ['gerente-rrhh@empresa.com'],
          requiredApprovals: 1,
          timeoutDays: 3,
          onTimeout: 'ESCALATE',
          escalateTo: 'director-general@empresa.com',
        },
      },
    ] satisfies WorkflowStep[],
  }

  const newWorkerWorkflow: WorkflowDefinition = {
    id: 'wf-trabajador-nuevo',
    orgId: demoOrgId,
    name: 'Onboarding Trabajador Nuevo',
    description: 'Automatiza el proceso de alta de un nuevo trabajador.',
    version: 1,
    active: true,
    triggerId: 'trigger-worker-created',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z',
    steps: [
      {
        id: 'step-1',
        name: 'Crear legajo digital',
        type: 'ACTION',
        order: 1,
        errorStrategy: 'ABORT',
        config: { type: 'CREATE_RECORD', entity: 'expediente', data: { tipo: 'legajo-nuevo' } },
      },
      {
        id: 'step-2',
        name: 'Asignar capacitaciones obligatorias',
        type: 'ACTION',
        order: 2,
        errorStrategy: 'CONTINUE',
        config: { type: 'CREATE_RECORD', entity: 'training_assignment', data: { courses: ['SST', 'Hostigamiento', 'LSST'] } },
      },
      {
        id: 'step-3',
        name: 'Notificar al trabajador',
        type: 'NOTIFICATION',
        order: 3,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: ['nuevo-trabajador@empresa.com'],
          subject: 'Bienvenido a la empresa',
          body: 'Se ha registrado su alta. Por favor complete sus capacitaciones obligatorias.',
        },
      },
    ] satisfies WorkflowStep[],
  }

  workflowEngine.registerWorkflow(contractExpiryWorkflow)
  workflowEngine.registerWorkflow(newWorkerWorkflow)

  // Register event triggers
  const contractTrigger: WorkflowTrigger = {
    id: 'trigger-contract-expiring',
    workflowId: 'wf-contrato-vencer',
    orgId: demoOrgId,
    type: 'EVENT',
    config: { eventName: 'contract.expiring' },
    active: true,
    name: 'Contrato por vencer',
    description: 'Se activa cuando un contrato esta proximo a vencer.',
    createdAt: '2026-01-15T10:00:00Z',
  }

  const workerTrigger: WorkflowTrigger = {
    id: 'trigger-worker-created',
    workflowId: 'wf-trabajador-nuevo',
    orgId: demoOrgId,
    type: 'EVENT',
    config: { eventName: 'worker.created' },
    active: true,
    name: 'Alta de trabajador',
    description: 'Se activa cuando se registra un nuevo trabajador.',
    createdAt: '2026-01-20T10:00:00Z',
  }

  registerTrigger(contractTrigger)
  registerTrigger(workerTrigger)
}

/* ------------------------------------------------------------------ */
/*  POST – Execute a workflow                                          */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest): Promise<NextResponse> {
  seedDemoData()

  // SECURITY: Validate auth — this was previously a public endpoint!
  let orgId: string
  try {
    const { getAuthContext } = await import('@/lib/auth')
    const ctx = await getAuthContext()
    if (!ctx) throw new Error('No auth context')
    orgId = ctx.orgId
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json() as {
      workflowId?: string
      event?: { name: string; payload: Record<string, unknown> }
      triggerData?: Record<string, unknown>
    }

    // SECURITY: orgId always from auth context, NEVER from body

    // Mode 1: Direct workflow execution
    if (body.workflowId) {
      const execution = await workflowEngine.executeWorkflow(
        body.workflowId,
        body.triggerData ?? {},
      )
      return NextResponse.json({
        success: true,
        execution,
      })
    }

    // Mode 2: Event-based – find matching triggers and execute
    if (body.event) {
      const matchedTriggers = matchTriggers(body.event, orgId)

      if (matchedTriggers.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No se encontraron workflows para este evento.',
          matchedTriggers: 0,
          executions: [],
        })
      }

      const executions = await Promise.all(
        matchedTriggers.map((trigger) =>
          workflowEngine.executeWorkflow(trigger.workflowId, {
            ...body.event!.payload,
            _eventName: body.event!.name,
            _triggerId: trigger.id,
          }),
        ),
      )

      return NextResponse.json({
        success: true,
        matchedTriggers: matchedTriggers.length,
        executions,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Se requiere workflowId o event en el cuerpo de la peticion.' },
      { status: 400 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  GET – List workflow executions                                     */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest): Promise<NextResponse> {
  seedDemoData()

  try {
    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('workflowId') ?? undefined
    const orgId = searchParams.get('orgId') ?? undefined
    const status = (searchParams.get('status') as ExecutionStatus) ?? undefined

    const executions = workflowEngine.listExecutions({ workflowId, orgId, status })
    const workflows = workflowEngine.listWorkflows(orgId)

    return NextResponse.json({
      success: true,
      total: executions.length,
      executions,
      availableWorkflows: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        active: w.active,
        stepsCount: w.steps.length,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}
