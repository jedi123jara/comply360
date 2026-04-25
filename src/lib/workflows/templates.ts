/**
 * Templates prefabricados de workflows.
 *
 * El MVP no incluye editor visual — el usuario elige uno de estos templates
 * y lo activa. Los parámetros (emails, días de umbral) se personalizan en
 * un form simple al momento de crear.
 *
 * Cada template produce un `{ name, description, triggerId, steps[] }` que
 * se guarda en la DB como `Workflow` con el stepsJson ya armado.
 */

import type { WorkflowStep } from './engine'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'contratos' | 'onboarding' | 'compliance' | 'sst'
  triggerId: string
  params: Array<{
    key: string
    label: string
    type: 'email' | 'number' | 'text'
    default?: string | number
    required?: boolean
  }>
  /**
   * Recibe los valores del usuario y devuelve los pasos hidratados.
   * Así mantenemos el template como función pura sin state.
   */
  buildSteps: (values: Record<string, string | number>) => WorkflowStep[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ══════════════════════════════════════════════════════════════════════
  // 1. Alerta de contrato por vencer
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'contract-expiry-alert',
    name: 'Alerta de contrato por vencer',
    description:
      'Revisa todos los días los contratos. Si queda menos del umbral configurado, envía un email al responsable de RRHH.',
    category: 'contratos',
    triggerId: 'cron.daily.contracts-check',
    params: [
      {
        key: 'daysThreshold',
        label: 'Días antes del vencimiento para alertar',
        type: 'number',
        default: 30,
        required: true,
      },
      {
        key: 'notifyEmail',
        label: 'Email del responsable',
        type: 'email',
        required: true,
      },
    ],
    buildSteps: (values) => [
      {
        id: 'check-days',
        name: 'Verificar días hasta vencimiento',
        type: 'CONDITION',
        order: 1,
        errorStrategy: 'ABORT',
        config: {
          field: 'contract.daysToExpiry',
          operator: 'lte',
          value: Number(values.daysThreshold ?? 30),
          onFalse: 'SKIP',
        },
      },
      {
        id: 'notify',
        name: 'Notificar al responsable',
        type: 'NOTIFICATION',
        order: 2,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: [String(values.notifyEmail ?? '')],
          subject: 'Contrato por vencer en {{contract.daysToExpiry}} días',
          body:
            'El contrato de {{worker.fullName}} ({{contract.type}}) vence el {{contract.endDate}}. ' +
            'Evaluá renovación, cese o conversión a indeterminado.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 2. Onboarding nuevo trabajador
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'worker-onboarding',
    name: 'Onboarding de nuevo trabajador',
    description:
      'Al registrar un trabajador nuevo, notifica al área de RRHH, espera 2 días y avisa si el legajo aún está incompleto.',
    category: 'onboarding',
    triggerId: 'event.worker.created',
    params: [
      {
        key: 'notifyEmail',
        label: 'Email del área de RRHH',
        type: 'email',
        required: true,
      },
      {
        key: 'waitDays',
        label: 'Días de espera antes del recordatorio',
        type: 'number',
        default: 2,
      },
    ],
    buildSteps: (values) => [
      {
        id: 'welcome',
        name: 'Notificar al área',
        type: 'NOTIFICATION',
        order: 1,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: [String(values.notifyEmail ?? '')],
          subject: 'Nuevo trabajador: {{worker.fullName}}',
          body:
            'Se registró {{worker.fullName}} (DNI {{worker.dni}}) en el sistema. ' +
            'Puedes completar su legajo desde el panel.',
        },
      },
      {
        id: 'wait',
        name: 'Esperar',
        type: 'WAIT',
        order: 2,
        errorStrategy: 'CONTINUE',
        config: {
          days: Number(values.waitDays ?? 2),
        },
      },
      {
        id: 'check-legajo',
        name: 'Verificar completitud del legajo',
        type: 'CONDITION',
        order: 3,
        errorStrategy: 'ABORT',
        config: {
          field: 'worker.legajoScore',
          operator: 'lt',
          value: 80,
          onFalse: 'SKIP',
        },
      },
      {
        id: 'remind',
        name: 'Recordar completar legajo',
        type: 'NOTIFICATION',
        order: 4,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: [String(values.notifyEmail ?? '')],
          subject: 'Legajo incompleto: {{worker.fullName}}',
          body:
            'El legajo digital de {{worker.fullName}} está al {{worker.legajoScore}}%. ' +
            'Subí los documentos pendientes antes de una inspección SUNAFIL.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 3. Recordatorio de CTS
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'cts-reminder',
    name: 'Recordatorio de depósito CTS',
    description:
      'Envía recordatorio al responsable de planilla 7 días antes del 15 de mayo y 15 de noviembre.',
    category: 'compliance',
    triggerId: 'cron.cts.semestral',
    params: [
      {
        key: 'notifyEmail',
        label: 'Email del responsable de planilla',
        type: 'email',
        required: true,
      },
    ],
    buildSteps: (values) => [
      {
        id: 'notify',
        name: 'Recordatorio CTS',
        type: 'NOTIFICATION',
        order: 1,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: [String(values.notifyEmail ?? '')],
          subject: 'Depósito CTS en 7 días',
          body:
            'Recuerda que el depósito de CTS vence el {{cts.deadline}}. ' +
            'Revisa la calculadora integrada en COMPLY360 para el monto por trabajador.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 4. Capacitación SST pendiente
  // ══════════════════════════════════════════════════════════════════════
  {
    id: 'sst-training-reminder',
    name: 'Recordatorio de capacitación SST pendiente',
    description:
      'Cada mes revisa cuántos trabajadores tienen capacitaciones SST vencidas y notifica al Comité.',
    category: 'sst',
    triggerId: 'cron.monthly.sst-review',
    params: [
      {
        key: 'notifyEmail',
        label: 'Email del presidente del Comité SST',
        type: 'email',
        required: true,
      },
      {
        key: 'threshold',
        label: 'Umbral de trabajadores pendientes',
        type: 'number',
        default: 5,
      },
    ],
    buildSteps: (values) => [
      {
        id: 'check',
        name: 'Verificar pendientes',
        type: 'CONDITION',
        order: 1,
        errorStrategy: 'ABORT',
        config: {
          field: 'sst.pendingTrainings',
          operator: 'gte',
          value: Number(values.threshold ?? 5),
          onFalse: 'SKIP',
        },
      },
      {
        id: 'notify',
        name: 'Notificar al Comité',
        type: 'NOTIFICATION',
        order: 2,
        errorStrategy: 'CONTINUE',
        config: {
          channel: 'EMAIL',
          recipients: [String(values.notifyEmail ?? '')],
          subject: 'Capacitaciones SST pendientes',
          body:
            'Hay {{sst.pendingTrainings}} trabajadores con capacitaciones SST vencidas o pendientes. ' +
            'La Ley 29783 exige 4 capacitaciones anuales por trabajador.',
        },
      },
    ],
  },
]

export function findTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id)
}
