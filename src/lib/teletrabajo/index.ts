/**
 * 🏆 MÓDULO TELETRABAJO — Ley 31572 + D.S. 002-2023-TR
 *
 * Cumple las obligaciones del empleador en modalidad teletrabajo:
 *  1. Registro de jornada digital (Art. 4)
 *  2. Política de desconexión digital (Art. 11)
 *  3. Reembolso de costos asumidos por el trabajador (Art. 9)
 *  4. Acuerdo escrito de teletrabajo (Art. 6)
 *
 * NOTA: Esta es una implementación inicial in-memory. Una vez aprobada,
 * migrar a Prisma con tablas TeleworkLog, DisconnectionPolicy, TeleworkExpense.
 */

import { randomUUID } from 'crypto'

// =============================================
// TYPES
// =============================================

export interface TeleworkLog {
  id: string
  orgId: string
  workerId: string
  /** Fecha del registro YYYY-MM-DD */
  fecha: string
  /** Hora inicio HH:MM (24h) */
  horaInicio: string
  /** Hora fin HH:MM */
  horaFin: string
  /** Duración minutos calculada */
  duracionMinutos: number
  /** Tipo: ORDINARIA / EXTRA / DESCANSO */
  tipo: 'ORDINARIA' | 'EXTRA' | 'DESCANSO'
  /** Notas opcionales */
  notas?: string
  /** Auto-detectado fuera de horario */
  fueraDeHorario: boolean
  createdAt: Date
}

export interface DisconnectionPolicy {
  id: string
  orgId: string
  /** Hora de inicio del derecho a desconexión (HH:MM) */
  horaDesconexionInicio: string
  /** Hora de fin del derecho a desconexión */
  horaDesconexionFin: string
  /** Días no laborables (0=domingo, 1=lunes, ...) */
  diasNoLaborables: number[]
  /** Texto de la política */
  textoPolitica: string
  /** ¿Bloquea notificaciones automáticamente? */
  bloqueoAutomatico: boolean
  vigenciaDesde: Date
  updatedAt: Date
}

export interface TeleworkExpense {
  id: string
  orgId: string
  workerId: string
  /** Periodo YYYY-MM */
  periodo: string
  /** Concepto */
  concepto:
    | 'INTERNET'
    | 'ELECTRICIDAD'
    | 'EQUIPOS'
    | 'MOBILIARIO'
    | 'OTROS'
  /** Monto en soles */
  montoSoles: number
  /** Estado de la solicitud */
  estado: 'PENDIENTE' | 'APROBADO' | 'PAGADO' | 'RECHAZADO'
  comprobanteUrl?: string
  createdAt: Date
}

// =============================================
// VALIDACIÓN
// =============================================

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function validarHora(h: string): boolean {
  return HORA_RE.test(h)
}

export function calcularDuracionMinutos(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  let diff = hf * 60 + mf - (hi * 60 + mi)
  if (diff < 0) diff += 24 * 60 // cruza medianoche
  return diff
}

export function detectarFueraDeHorario(
  log: { horaInicio: string; horaFin: string; fecha: string },
  policy: DisconnectionPolicy | null
): boolean {
  if (!policy) return false
  // Día no laborable
  const dow = new Date(log.fecha).getDay()
  if (policy.diasNoLaborables.includes(dow)) return true
  // Hora dentro de la franja de desconexión
  const [hdi, mdi] = policy.horaDesconexionInicio.split(':').map(Number)
  const [hdf, mdf] = policy.horaDesconexionFin.split(':').map(Number)
  const ini = hdi * 60 + mdi
  const fin = hdf * 60 + mdf
  const [hi, mi] = log.horaInicio.split(':').map(Number)
  const inicioLog = hi * 60 + mi
  // Cruza medianoche en la franja
  if (fin < ini) {
    return inicioLog >= ini || inicioLog <= fin
  }
  return inicioLog >= ini && inicioLog <= fin
}

// =============================================
// IN-MEMORY STORE (provisional)
// =============================================

const logsStore = new Map<string, TeleworkLog[]>() // key: orgId
const policyStore = new Map<string, DisconnectionPolicy>() // key: orgId
const expensesStore = new Map<string, TeleworkExpense[]>() // key: orgId

// LOGS

export function createLog(input: {
  orgId: string
  workerId: string
  fecha: string
  horaInicio: string
  horaFin: string
  tipo?: TeleworkLog['tipo']
  notas?: string
}): TeleworkLog {
  if (!validarHora(input.horaInicio) || !validarHora(input.horaFin)) {
    throw new Error('Hora inválida (formato HH:MM)')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    throw new Error('Fecha inválida (formato YYYY-MM-DD)')
  }

  const policy = policyStore.get(input.orgId) || null
  const log: TeleworkLog = {
    id: randomUUID(),
    orgId: input.orgId,
    workerId: input.workerId,
    fecha: input.fecha,
    horaInicio: input.horaInicio,
    horaFin: input.horaFin,
    duracionMinutos: calcularDuracionMinutos(input.horaInicio, input.horaFin),
    tipo: input.tipo || 'ORDINARIA',
    notas: input.notas,
    fueraDeHorario: detectarFueraDeHorario(input, policy),
    createdAt: new Date(),
  }
  const list = logsStore.get(input.orgId) || []
  list.push(log)
  logsStore.set(input.orgId, list)
  return log
}

export function listLogs(orgId: string, opts?: { workerId?: string; from?: string; to?: string }): TeleworkLog[] {
  let list = logsStore.get(orgId) || []
  if (opts?.workerId) list = list.filter(l => l.workerId === opts.workerId)
  if (opts?.from) list = list.filter(l => l.fecha >= opts.from!)
  if (opts?.to) list = list.filter(l => l.fecha <= opts.to!)
  return list.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// POLICY

export function getPolicy(orgId: string): DisconnectionPolicy | null {
  return policyStore.get(orgId) || null
}

export function upsertPolicy(orgId: string, input: Partial<Omit<DisconnectionPolicy, 'id' | 'orgId' | 'updatedAt'>>): DisconnectionPolicy {
  const existing = policyStore.get(orgId)
  const policy: DisconnectionPolicy = {
    id: existing?.id || randomUUID(),
    orgId,
    horaDesconexionInicio: input.horaDesconexionInicio || existing?.horaDesconexionInicio || '20:00',
    horaDesconexionFin: input.horaDesconexionFin || existing?.horaDesconexionFin || '08:00',
    diasNoLaborables: input.diasNoLaborables || existing?.diasNoLaborables || [0, 6],
    textoPolitica:
      input.textoPolitica ||
      existing?.textoPolitica ||
      'En cumplimiento del Art. 11 de la Ley 31572, esta organización reconoce el derecho a la desconexión digital. Fuera de la jornada de trabajo, los trabajadores no están obligados a responder comunicaciones laborales ni a permanecer disponibles.',
    bloqueoAutomatico: input.bloqueoAutomatico ?? existing?.bloqueoAutomatico ?? true,
    vigenciaDesde: existing?.vigenciaDesde || new Date(),
    updatedAt: new Date(),
  }
  policyStore.set(orgId, policy)
  return policy
}

// EXPENSES

export function createExpense(input: Omit<TeleworkExpense, 'id' | 'createdAt'>): TeleworkExpense {
  const expense: TeleworkExpense = {
    ...input,
    id: randomUUID(),
    createdAt: new Date(),
  }
  const list = expensesStore.get(input.orgId) || []
  list.push(expense)
  expensesStore.set(input.orgId, list)
  return expense
}

export function listExpenses(orgId: string, opts?: { workerId?: string; periodo?: string }): TeleworkExpense[] {
  let list = expensesStore.get(orgId) || []
  if (opts?.workerId) list = list.filter(e => e.workerId === opts.workerId)
  if (opts?.periodo) list = list.filter(e => e.periodo === opts.periodo)
  return list.sort((a, b) => b.periodo.localeCompare(a.periodo))
}

// =============================================
// REPORTE / RESUMEN
// =============================================

export interface TeleworkSummary {
  totalLogs: number
  totalHoras: number
  trabajadoresActivos: number
  logsFueraDeHorario: number
  porcentajeFueraDeHorario: number
  totalReembolsosPendientes: number
  totalReembolsosPagados: number
  policyConfigurada: boolean
  cumplimientoLey31572: number // 0-100
}

export function getTeleworkSummary(orgId: string): TeleworkSummary {
  const logs = logsStore.get(orgId) || []
  const policy = policyStore.get(orgId)
  const expenses = expensesStore.get(orgId) || []

  const totalHoras = Math.round((logs.reduce((acc, l) => acc + l.duracionMinutos, 0) / 60) * 100) / 100
  const trabajadoresActivos = new Set(logs.map(l => l.workerId)).size
  const logsFueraDeHorario = logs.filter(l => l.fueraDeHorario).length
  const porcentajeFueraDeHorario =
    logs.length === 0 ? 0 : Math.round((logsFueraDeHorario / logs.length) * 1000) / 10

  const totalPendientes = expenses
    .filter(e => e.estado === 'PENDIENTE')
    .reduce((acc, e) => acc + e.montoSoles, 0)
  const totalPagados = expenses
    .filter(e => e.estado === 'PAGADO')
    .reduce((acc, e) => acc + e.montoSoles, 0)

  // Score de cumplimiento Ley 31572
  let score = 0
  if (policy) score += 40 // política configurada
  if (logs.length > 0) score += 30 // registro de jornada activo
  if (totalPendientes === 0 && expenses.length > 0) score += 20 // reembolsos al día
  else if (expenses.length === 0) score += 10
  if (porcentajeFueraDeHorario < 5) score += 10 // pocas violaciones de desconexión

  return {
    totalLogs: logs.length,
    totalHoras,
    trabajadoresActivos,
    logsFueraDeHorario,
    porcentajeFueraDeHorario,
    totalReembolsosPendientes: Math.round(totalPendientes * 100) / 100,
    totalReembolsosPagados: Math.round(totalPagados * 100) / 100,
    policyConfigurada: Boolean(policy),
    cumplimientoLey31572: Math.min(100, score),
  }
}
