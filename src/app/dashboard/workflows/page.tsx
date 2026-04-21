'use client'

import { useState } from 'react'
import {
  Workflow, Plus, Play, Pause, ChevronRight, Clock, Bell,
  FileText, Users, Shield, Zap, Settings, Check, ArrowRight,
  RotateCw, X, AlertTriangle, BookOpen, CalendarClock,
  CheckCircle2, XCircle, Timer, ChevronDown, ChevronUp,
  TrendingUp, Activity,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StepType = 'trigger' | 'action' | 'condition' | 'notification'

interface WorkflowStep {
  id: number
  icon: keyof typeof stepIcons
  action: string
  config: string
  delay?: string
  type: StepType
}

interface ExecutionLog {
  id: string
  workflowName: string
  triggeredAt: string
  status: 'success' | 'failed' | 'in_progress'
  duration: string
  details: string
}

interface WorkflowTemplate {
  id: string
  name: string
  emoji: string
  description: string
  flowSummary: string
  icon: keyof typeof stepIcons
  trigger: string
  triggerDetail: string
  steps: WorkflowStep[]
  active: boolean
  executions: number
  successRate: number
  lastRun?: string
  nextRun?: string
}

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const stepIcons = {
  bell: Bell,
  fileText: FileText,
  users: Users,
  shield: Shield,
  zap: Zap,
  clock: Clock,
  check: Check,
  settings: Settings,
  workflow: Workflow,
  play: Play,
  bookOpen: BookOpen,
  alertTriangle: AlertTriangle,
  rotateCw: RotateCw,
  calendarClock: CalendarClock,
  activity: Activity,
}

function StepIcon({ name, className }: { name: keyof typeof stepIcons; className?: string }) {
  const Icon = stepIcons[name]
  return <Icon className={className} />
}

const stepTypeLabels: Record<StepType, string> = {
  trigger: 'Trigger',
  action: 'Acci\u00f3n',
  condition: 'Condici\u00f3n',
  notification: 'Notificaci\u00f3n',
}

const stepTypeColors: Record<StepType, { bg: string; text: string; border: string; dot: string }> = {
  trigger: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-700',
    border: 'border-amber-600',
    dot: 'bg-amber-500',
  },
  action: {
    bg: 'bg-blue-900/20',
    text: 'text-emerald-600',
    border: 'border-blue-600',
    dot: 'bg-blue-500',
  },
  condition: {
    bg: 'bg-purple-900/20',
    text: 'text-purple-300',
    border: 'border-purple-600',
    dot: 'bg-purple-500',
  },
  notification: {
    bg: 'bg-emerald-900/20',
    text: 'text-emerald-700',
    border: 'border-emerald-600',
    dot: 'bg-emerald-500',
  },
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

const initialTemplates: WorkflowTemplate[] = [
  {
    id: 'contrato-vencer',
    name: 'Contrato por Vencer',
    emoji: '\ud83d\udcc4',
    description: 'Cuando un contrato vence en 30 d\u00edas \u2192 Notificar a RRHH \u2192 Generar nuevo contrato \u2192 Enviar a firma',
    flowSummary: 'Vencimiento \u2192 Notificaci\u00f3n \u2192 Generaci\u00f3n \u2192 Firma',
    icon: 'fileText',
    trigger: 'Temporal',
    triggerDetail: '30 d\u00edas antes del vencimiento',
    steps: [
      { id: 1, icon: 'clock', action: 'Contrato vence en 30 d\u00edas', config: 'Monitoreo autom\u00e1tico de fechas', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'bell', action: 'Notificar a RRHH', config: 'Email + notificaci\u00f3n en plataforma', delay: 'Inmediato', type: 'notification' },
      { id: 3, icon: 'fileText', action: 'Generar nuevo contrato', config: 'Usar plantilla vigente con datos actualizados', delay: '1 d\u00eda', type: 'action' },
      { id: 4, icon: 'check', action: 'Enviar a firma', config: 'Firma digital del trabajador y empleador', delay: '2 d\u00edas', type: 'action' },
    ],
    active: true,
    executions: 47,
    successRate: 96,
    lastRun: '2026-04-03',
    nextRun: '2026-04-08 09:00',
  },
  {
    id: 'alerta-cts',
    name: 'Alerta de CTS',
    emoji: '\u23f0',
    description: '15 d\u00edas antes de mayo/noviembre \u2192 Calcular CTS pendiente \u2192 Notificar a contabilidad',
    flowSummary: 'Calendario \u2192 C\u00e1lculo \u2192 Notificaci\u00f3n',
    icon: 'calendarClock',
    trigger: 'Temporal',
    triggerDetail: '15 d\u00edas antes de mayo y noviembre',
    steps: [
      { id: 1, icon: 'calendarClock', action: '15 d\u00edas antes de mayo/noviembre', config: 'Calendario laboral peruano', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'activity', action: 'Calcular CTS pendiente', config: 'Base: remuneraci\u00f3n computable + 1/6 gratificaci\u00f3n', delay: 'Inmediato', type: 'action' },
      { id: 3, icon: 'check', action: 'Verificar datos de cuenta', config: 'Validar entidad depositaria de cada trabajador', delay: '1 d\u00eda', type: 'condition' },
      { id: 4, icon: 'bell', action: 'Notificar a contabilidad', config: 'Reporte con montos y cuentas bancarias', delay: 'Inmediato', type: 'notification' },
    ],
    active: true,
    executions: 18,
    successRate: 100,
    lastRun: '2026-04-01',
    nextRun: '2026-04-16 08:00',
  },
  {
    id: 'trabajador-nuevo',
    name: 'Nuevo Trabajador',
    emoji: '\ud83d\udc77',
    description: 'Al registrar trabajador \u2192 Verificar DNI en RENIEC \u2192 Crear expediente \u2192 Asignar capacitaciones obligatorias',
    flowSummary: 'Registro \u2192 Verificaci\u00f3n \u2192 Expediente \u2192 Capacitaci\u00f3n',
    icon: 'users',
    trigger: 'Evento',
    triggerDetail: 'Alta de trabajador en el sistema',
    steps: [
      { id: 1, icon: 'users', action: 'Registrar trabajador', config: 'Formulario de alta completado', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'shield', action: 'Verificar DNI en RENIEC', config: 'Consulta API RENIEC - validar identidad', delay: 'Inmediato', type: 'condition' },
      { id: 3, icon: 'fileText', action: 'Crear expediente digital', config: 'Legajo con documentos obligatorios', delay: '1 d\u00eda', type: 'action' },
      { id: 4, icon: 'bookOpen', action: 'Asignar capacitaciones obligatorias', config: 'SST + Hostigamiento + LSST + Inducci\u00f3n', delay: '1 d\u00eda', type: 'action' },
    ],
    active: true,
    executions: 23,
    successRate: 91,
    lastRun: '2026-04-04',
    nextRun: 'Bajo demanda',
  },
  {
    id: 'capacitacion-vencida',
    name: 'Capacitaci\u00f3n Vencida',
    emoji: '\ud83c\udf93',
    description: 'Cuando certificado vence \u2192 Notificar al trabajador \u2192 Re-inscribir en curso \u2192 Alertar si no completa en 15 d\u00edas',
    flowSummary: 'Vencimiento \u2192 Notificaci\u00f3n \u2192 Re-inscripci\u00f3n \u2192 Escalamiento',
    icon: 'bookOpen',
    trigger: 'Temporal',
    triggerDetail: 'Certificado de capacitaci\u00f3n vencido',
    steps: [
      { id: 1, icon: 'clock', action: 'Certificado vencido detectado', config: 'Monitoreo diario de fechas de vigencia', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'bell', action: 'Notificar al trabajador', config: 'Email + SMS con enlace al curso', delay: 'Inmediato', type: 'notification' },
      { id: 3, icon: 'bookOpen', action: 'Re-inscribir en curso', config: 'Inscripci\u00f3n autom\u00e1tica en siguiente sesi\u00f3n', delay: '1 d\u00eda', type: 'action' },
      { id: 4, icon: 'alertTriangle', action: 'Alertar si no completa en 15 d\u00edas', config: 'Escalamiento a jefatura directa y RRHH', delay: '15 d\u00edas', type: 'condition' },
    ],
    active: true,
    executions: 36,
    successRate: 89,
    lastRun: '2026-04-05',
    nextRun: '2026-04-07 06:00',
  },
  {
    id: 'reporte-mensual',
    name: 'Reporte Mensual',
    emoji: '\ud83d\udcca',
    description: 'D\u00eda 1 de cada mes \u2192 Generar reporte de cumplimiento \u2192 Enviar por email a gerencia',
    flowSummary: 'Calendario \u2192 Generaci\u00f3n \u2192 Env\u00edo',
    icon: 'fileText',
    trigger: 'Temporal',
    triggerDetail: 'D\u00eda 1 de cada mes a las 07:00',
    steps: [
      { id: 1, icon: 'calendarClock', action: 'D\u00eda 1 de cada mes', config: 'Cron: 0 7 1 * *', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'activity', action: 'Recopilar m\u00e9tricas de cumplimiento', config: 'Score general, por \u00e1rea y por m\u00f3dulo', delay: 'Inmediato', type: 'action' },
      { id: 3, icon: 'fileText', action: 'Generar reporte PDF', config: 'Plantilla ejecutiva con gr\u00e1ficos', delay: '30 min', type: 'action' },
      { id: 4, icon: 'bell', action: 'Enviar por email a gerencia', config: 'Gerencia General + Directores de \u00e1rea', delay: 'Inmediato', type: 'notification' },
    ],
    active: true,
    executions: 12,
    successRate: 100,
    lastRun: '2026-04-01',
    nextRun: '2026-05-01 07:00',
  },
  {
    id: 'denuncia-recibida',
    name: 'Denuncia Recibida',
    emoji: '\u26a0\ufe0f',
    description: 'Al recibir denuncia \u2192 Asignar investigador \u2192 Crear timeline \u2192 Notificar comit\u00e9',
    flowSummary: 'Denuncia \u2192 Asignaci\u00f3n \u2192 Timeline \u2192 Comit\u00e9',
    icon: 'alertTriangle',
    trigger: 'Evento',
    triggerDetail: 'Nueva denuncia registrada en el canal',
    steps: [
      { id: 1, icon: 'alertTriangle', action: 'Recibir denuncia', config: 'Canal de denuncias interno o externo', delay: 'Inicio', type: 'trigger' },
      { id: 2, icon: 'users', action: 'Asignar investigador', config: 'Comit\u00e9 de Intervenci\u00f3n frente al Hostigamiento', delay: 'Inmediato', type: 'action' },
      { id: 3, icon: 'clock', action: 'Crear timeline de investigaci\u00f3n', config: '30 d\u00edas calendario seg\u00fan Ley 27942', delay: 'Inmediato', type: 'action' },
      { id: 4, icon: 'bell', action: 'Notificar al comit\u00e9', config: 'Email confidencial a miembros del comit\u00e9', delay: 'Inmediato', type: 'notification' },
    ],
    active: false,
    executions: 8,
    successRate: 100,
    lastRun: '2026-02-20',
    nextRun: 'Bajo demanda',
  },
]

const initialExecutionLogs: ExecutionLog[] = [
  { id: 'ex1', workflowName: 'Capacitaci\u00f3n Vencida', triggeredAt: '2026-04-05 14:32', status: 'success', duration: '2m 14s', details: 'Certificado de SST vencido para Carlos M. \u2014 Re-inscrito en curso del 12/04. Notificaci\u00f3n enviada.' },
  { id: 'ex2', workflowName: 'Contrato por Vencer', triggeredAt: '2026-04-05 09:00', status: 'success', duration: '1m 45s', details: 'Contrato de Ana P. vence el 05/05. Borrador generado y enviado a RRHH para revisi\u00f3n.' },
  { id: 'ex3', workflowName: 'Nuevo Trabajador', triggeredAt: '2026-04-04 16:20', status: 'failed', duration: '0m 32s', details: 'Error en verificaci\u00f3n RENIEC: servicio no disponible. Se reintenta en 1 hora.' },
  { id: 'ex4', workflowName: 'Reporte Mensual', triggeredAt: '2026-04-01 07:00', status: 'success', duration: '5m 10s', details: 'Reporte de marzo generado. Score general: 94/100. Enviado a 5 destinatarios.' },
  { id: 'ex5', workflowName: 'Alerta de CTS', triggeredAt: '2026-04-01 08:00', status: 'success', duration: '3m 22s', details: 'CTS de mayo calculada para 48 trabajadores. Total: S/ 127,450.00. Notificado a contabilidad.' },
  { id: 'ex6', workflowName: 'Contrato por Vencer', triggeredAt: '2026-03-30 09:00', status: 'in_progress', duration: '---', details: 'Contrato de Luis R. \u2014 Borrador generado, pendiente firma del gerente.' },
  { id: 'ex7', workflowName: 'Denuncia Recibida', triggeredAt: '2026-02-20 11:15', status: 'success', duration: '1m 08s', details: 'Denuncia an\u00f3nima asignada a Dra. G\u00f3mez. Timeline creado. Comit\u00e9 notificado.' },
  { id: 'ex8', workflowName: 'Capacitaci\u00f3n Vencida', triggeredAt: '2026-03-28 06:00', status: 'failed', duration: '0m 18s', details: 'No se pudo re-inscribir: curso completo. Escalado a RRHH para programar sesi\u00f3n adicional.' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(initialTemplates)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates')

  const selected = workflows.find((w) => w.id === selectedId) ?? null
  const activeCount = workflows.filter((w) => w.active).length
  const totalExecs = workflows.reduce((s, w) => s + w.executions, 0)
  const successCount = initialExecutionLogs.filter((l) => l.status === 'success').length
  const failedCount = initialExecutionLogs.filter((l) => l.status === 'failed').length

  // Find next upcoming run
  const nextRunWorkflow = workflows
    .filter((w) => w.active && w.nextRun && w.nextRun !== 'Bajo demanda')
    .sort((a, b) => (a.nextRun! > b.nextRun! ? 1 : -1))[0]

  function toggleActive(id: string) {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)))
  }

  function handleCreate() {
    if (!newName.trim()) return
    const custom: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name: newName,
      emoji: '\u2699\ufe0f',
      description: newDescription || 'Workflow personalizado',
      flowSummary: 'Personalizado',
      icon: 'settings',
      trigger: 'Personalizado',
      triggerDetail: newTrigger || 'Definido por el usuario',
      steps: [
        { id: 1, icon: 'zap', action: 'Paso inicial', config: 'Configurar acci\u00f3n', delay: 'Inicio', type: 'trigger' },
        { id: 2, icon: 'bell', action: 'Notificar', config: 'Seleccionar destinatarios', delay: 'Inmediato', type: 'notification' },
      ],
      active: false,
      executions: 0,
      successRate: 0,
    }
    setWorkflows((prev) => [...prev, custom])
    setShowCreateModal(false)
    setNewName('')
    setNewTrigger('')
    setNewDescription('')
  }

  /* ================================================================ */
  /*  DETAIL VIEW                                                      */
  /* ================================================================ */
  if (selected) {
    return (
      <div className="space-y-6">
        {/* Back + header */}
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Volver a workflows
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-3 text-2xl ${selected.active ? 'bg-emerald-900/40' : 'bg-[color:var(--neutral-100)] bg-gray-800'}`}>
              <span>{selected.emoji}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{selected.name}</h1>
              <p className="text-sm text-[color:var(--text-tertiary)] max-w-xl">{selected.description}</p>
            </div>
          </div>
          <button
            onClick={() => toggleActive(selected.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
              selected.active
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-200 text-[color:var(--text-secondary)] hover:bg-gray-700 text-[color:var(--text-secondary)] hover:bg-gray-600'
            }`}
          >
            {selected.active ? <><Pause className="h-4 w-4" /> Desactivar</> : <><Play className="h-4 w-4" /> Activar</>}
          </button>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Trigger', value: selected.triggerDetail, icon: <Zap className="h-5 w-5 text-amber-500" /> },
            { label: 'Ejecuciones', value: String(selected.executions), icon: <RotateCw className="h-5 w-5 text-blue-500" /> },
            { label: 'Tasa de \u00e9xito', value: `${selected.successRate}%`, icon: <TrendingUp className="h-5 w-5 text-emerald-500" /> },
            { label: 'Pr\u00f3xima ejecuci\u00f3n', value: selected.nextRun ?? 'No programada', icon: <CalendarClock className="h-5 w-5 text-purple-500" /> },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-4 flex items-center gap-3">
              <div className="rounded-lg bg-[color:var(--neutral-100)] bg-gray-800 p-2.5">{c.icon}</div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">{c.label}</p>
                <p className="text-sm font-semibold text-white">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Visual step flow - horizontal node-based */}
        <div className="rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Flujo Visual</h2>
          <p className="text-xs text-[color:var(--text-tertiary)] mb-6">{selected.flowSummary}</p>

          {/* Horizontal flow for desktop */}
          <div className="hidden md:flex items-start justify-center gap-0 overflow-x-auto pb-4">
            {selected.steps.map((step, idx) => {
              const colors = stepTypeColors[step.type]
              return (
                <div key={step.id} className="flex items-start">
                  {/* Node */}
                  <div className="flex flex-col items-center" style={{ minWidth: 160 }}>
                    <div className={`relative w-full rounded-xl border-2 ${colors.border} ${colors.bg} p-4`}>
                      {/* Type badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {stepTypeLabels[step.type]}
                        </span>
                        <span className="text-[10px] text-[color:var(--text-tertiary)] font-mono">#{step.id}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <StepIcon name={step.icon} className={`h-4 w-4 shrink-0 ${colors.text}`} />
                        <span className="text-xs font-semibold text-white leading-tight">{step.action}</span>
                      </div>
                      <p className="text-[11px] text-[color:var(--text-tertiary)] leading-snug">{step.config}</p>
                      {step.delay && (
                        <div className="mt-2 flex items-center gap-1">
                          <Timer className="h-3 w-3 text-[color:var(--text-tertiary)]" />
                          <span className="text-[10px] text-[color:var(--text-tertiary)]">{step.delay}</span>
                        </div>
                      )}
                      {/* Status indicator */}
                      {selected.active && (
                        <div className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white border-gray-900" />
                      )}
                    </div>
                  </div>
                  {/* Arrow connector */}
                  {idx < selected.steps.length - 1 && (
                    <div className="flex items-center self-center pt-2 px-1">
                      <div className={`w-6 h-0.5 ${selected.active ? 'bg-emerald-600' : 'bg-gray-600'}`} />
                      <ArrowRight className={`h-4 w-4 -ml-1 ${selected.active ? 'text-emerald-600' : 'text-gray-600'}`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Vertical flow for mobile */}
          <div className="md:hidden space-y-0">
            {selected.steps.map((step, idx) => {
              const colors = stepTypeColors[step.type]
              return (
                <div key={step.id}>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${colors.border} ${colors.bg}`}>
                        <StepIcon name={step.icon} className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      {idx < selected.steps.length - 1 && (
                        <div className={`w-0.5 grow ${selected.active ? 'bg-emerald-700' : 'bg-gray-700'}`} />
                      )}
                    </div>
                    <div className="pb-6 pt-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${colors.bg} ${colors.text}`}>
                          {stepTypeLabels[step.type]}
                        </span>
                        {step.delay && (
                          <span className="rounded-full bg-[color:var(--neutral-100)] bg-gray-800 px-2 py-0.5 text-xs text-[color:var(--text-tertiary)]">
                            {step.delay}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-white">{step.action}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{step.config}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Execution history */}
        <div className="rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de Ejecuciones</h2>
          <div className="divide-y divide-gray-100 divide-gray-800">
            {initialExecutionLogs
              .filter((l) => l.workflowName === selected.name)
              .map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.status === 'in_progress' && <Timer className="h-4 w-4 text-amber-500 animate-pulse" />}
                      <span className="text-sm text-[color:var(--text-secondary)]">{log.triggeredAt}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' :
                        'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400'
                      }`}>
                        {log.status === 'success' ? 'Exitoso' : log.status === 'failed' ? 'Fallido' : 'En progreso'}
                      </span>
                    </div>
                    <span className="text-xs text-[color:var(--text-tertiary)] font-mono">{log.duration}</span>
                  </div>
                  <p className="mt-1.5 ml-7 text-xs text-[color:var(--text-tertiary)]">{log.details}</p>
                </div>
              ))}
            {initialExecutionLogs.filter((l) => l.workflowName === selected.name).length === 0 && (
              <p className="py-4 text-sm text-[color:var(--text-tertiary)] text-center">Sin ejecuciones registradas</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /*  MAIN LIST VIEW                                                   */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Workflow className="h-7 w-7 text-indigo-400" />
            Automatizaci&oacute;n de Workflows
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
            Workflow builder visual con templates pre-configurados para cumplimiento laboral.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="h-4 w-4" /> Crear Workflow
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-5">
          <div className="rounded-lg p-2.5 bg-emerald-900/20">
            <Play className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeCount}</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">Workflows activos</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-5">
          <div className="rounded-lg p-2.5 bg-blue-900/20">
            <RotateCw className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalExecs}</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">Ejecuciones este mes</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-5">
          <div className="rounded-lg p-2.5 bg-amber-900/20">
            <Activity className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">{successCount}</span>
              <span className="text-sm text-[color:var(--text-tertiary)]">/</span>
              <span className="text-2xl font-bold text-red-400">{failedCount}</span>
            </div>
            <p className="text-xs text-[color:var(--text-tertiary)]">Exitosos vs Fallidos</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-5">
          <div className="rounded-lg p-2.5 bg-purple-900/20">
            <CalendarClock className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {nextRunWorkflow ? nextRunWorkflow.nextRun : 'N/A'}
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)]">
              Pr&oacute;xima ejecuci&oacute;n{nextRunWorkflow ? ` (${nextRunWorkflow.name})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[color:var(--neutral-100)] bg-gray-800 p-1 w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-white bg-gray-900 text-white shadow-sm'
              : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]'
          }`}
        >
          Templates Pre-configurados
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'logs'
              ? 'bg-white bg-gray-900 text-white shadow-sm'
              : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]'
          }`}
        >
          Log de Ejecuciones
        </button>
      </div>

      {/* Templates tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="group relative rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 p-5 hover:shadow-lg hover:border-indigo-300 hover:border-indigo-700 transition-all cursor-pointer"
              onClick={() => setSelectedId(wf.id)}
            >
              {/* Active/Inactive toggle */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(wf.id) }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    wf.active ? 'bg-emerald-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      wf.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Emoji + title */}
              <div className="flex items-start gap-3 mb-3">
                <div className="rounded-lg bg-indigo-900/30 p-2.5 text-xl leading-none flex items-center justify-center">
                  <span>{wf.emoji}</span>
                </div>
                <div className="pr-14 flex-1">
                  <h3 className="font-semibold text-white">{wf.name}</h3>
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)] leading-relaxed">{wf.description}</p>
                </div>
              </div>

              {/* Visual mini-flow */}
              <div className="flex items-center gap-1 mb-3 overflow-hidden">
                {wf.steps.map((step, idx) => {
                  const colors = stepTypeColors[step.type]
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`flex items-center gap-1 rounded-md px-2 py-1 ${colors.bg}`} title={step.action}>
                        <StepIcon name={step.icon} className={`h-3 w-3 ${colors.text}`} />
                        <span className={`text-[10px] font-medium ${colors.text} hidden sm:inline truncate max-w-[60px]`}>
                          {stepTypeLabels[step.type]}
                        </span>
                      </div>
                      {idx < wf.steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-gray-600 mx-0.5 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-[color:var(--text-tertiary)] mb-3">
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {wf.trigger}</span>
                <span className="flex items-center gap-1"><ArrowRight className="h-3.5 w-3.5" /> {wf.steps.length} pasos</span>
                <span className="flex items-center gap-1"><RotateCw className="h-3.5 w-3.5" /> {wf.executions} ejecuciones</span>
              </div>

              {/* Success rate bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[color:var(--neutral-100)] bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      wf.successRate >= 95 ? 'bg-emerald-500' : wf.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${wf.successRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-[color:var(--text-tertiary)] font-mono w-8 text-right">{wf.successRate}%</span>
              </div>

              {/* Status label */}
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  wf.active ? 'text-emerald-600' : 'text-[color:var(--text-tertiary)]'
                }`}>
                  {wf.active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {wf.active ? 'Activo' : 'Inactivo'}
                </span>
                <span className="flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalle <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}

          {/* Create custom card */}
          <div
            onClick={() => setShowCreateModal(true)}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 border-gray-600 bg-white bg-gray-900 p-8 hover:border-indigo-400 hover:border-indigo-500 hover:bg-indigo-900/10 transition-all cursor-pointer min-h-[260px]"
          >
            <div className="rounded-full bg-indigo-900/30 p-3">
              <Plus className="h-6 w-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-white">Crear Workflow Personalizado</p>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">Dise&ntilde;a un flujo a medida para tu empresa</p>
            </div>
          </div>
        </div>
      )}

      {/* Execution log tab */}
      {activeTab === 'logs' && (
        <div className="rounded-xl border border-[color:var(--border-default)] border-gray-700 bg-white bg-gray-900 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-[color:var(--neutral-50)] bg-gray-800/50 border-b border-[color:var(--border-default)] border-gray-700 text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-3">Workflow</div>
            <div className="col-span-3">Ejecutado</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2">Duraci&oacute;n</div>
            <div className="col-span-1"></div>
          </div>
          {/* Rows */}
          <div className="divide-y divide-gray-100 divide-gray-800">
            {initialExecutionLogs.map((log) => (
              <div key={log.id}>
                <div
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-[color:var(--neutral-50)] hover:bg-gray-800/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="col-span-1 flex justify-center">
                    {log.status === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {log.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                    {log.status === 'in_progress' && <Timer className="h-5 w-5 text-amber-500 animate-pulse" />}
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm font-medium text-white">{log.workflowName}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-[color:var(--text-secondary)]">{log.triggeredAt}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                      log.status === 'success' ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600' :
                      log.status === 'failed' ? 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' :
                      'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400'
                    }`}>
                      {log.status === 'success' ? 'Exitoso' : log.status === 'failed' ? 'Fallido' : 'En progreso'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-[color:var(--text-tertiary)] font-mono">{log.duration}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {expandedLogId === log.id
                      ? <ChevronUp className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                      : <ChevronDown className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                    }
                  </div>
                </div>
                {/* Expanded details */}
                {expandedLogId === log.id && (
                  <div className="px-6 pb-4">
                    <div className="ml-8 rounded-lg bg-[color:var(--neutral-50)] bg-gray-800/50 border border-[color:var(--border-default)] border-gray-700 p-4">
                      <p className="text-sm text-[color:var(--text-secondary)]">{log.details}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white bg-gray-900 border border-[color:var(--border-default)] border-gray-700 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border-default)] border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Nuevo Workflow Personalizado</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:text-gray-600 hover:bg-[color:var(--neutral-100)] hover:text-[color:var(--text-secondary)] hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1.5">
                  Nombre del workflow *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Revisi&oacute;n mensual de planillas"
                  className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1.5">
                  Trigger (disparador)
                </label>
                <input
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="Ej: Cada fin de mes, Al registrar incidencia..."
                  className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-1.5">
                  Descripci&oacute;n
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe el objetivo de este workflow..."
                  className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
                />
              </div>
              <div className="rounded-lg bg-indigo-900/20 border border-indigo-800 p-3">
                <p className="text-xs text-indigo-400">
                  <strong>Nota:</strong> Despu&eacute;s de crear el workflow, podr&aacute;s configurar los pasos detallados en el editor visual.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--border-default)] border-gray-700 px-6 py-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)] hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Crear Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
