/**
 * 🏆 INTEGRACIÓN CASILLA ELECTRÓNICA SUNAFIL
 *
 * La casilla electrónica SUNAFIL es el canal oficial por donde la SUNAFIL
 * notifica actas de inspección, citaciones, resoluciones y comunicaciones
 * formales a las empresas. A partir de 2026 (PLANAPP) es obligatoria y
 * las notificaciones tienen el mismo valor legal que una cédula física.
 *
 * Como la casilla no expone una API pública, este módulo implementa un
 * adapter pluggable para:
 *   1. Poller: un cron que revisa periódicamente la casilla (scraping
 *      autenticado) y crea SunafilNotification para cada nueva notificación
 *   2. Webhook: endpoint que puede recibir push desde un proveedor que monitoree
 *      la casilla (ej. un servicio partner o script desplegado por el cliente)
 *   3. Manual upload: subir manualmente un PDF que llegó por email institucional
 *
 * Cuando llega una notificación con acta SUNAFIL, dispara automáticamente:
 *   - Alerta al admin
 *   - Ejecución del Agente Analizador SUNAFIL sobre el PDF
 *   - Si hay cargos, oferta de ejecutar el Agente Descargo
 *   - Recordatorio calendario 3 días antes del vencimiento
 *
 * Storage: in-memory por ahora; migración a Prisma (modelo SunafilNotification)
 * pendiente en una iteración posterior.
 */

import { randomUUID } from 'crypto'

// =============================================
// TYPES
// =============================================

export type CasillaNotificationType =
  | 'ACTA_INSPECCION'
  | 'CITACION'
  | 'RESOLUCION'
  | 'REQUERIMIENTO_DOC'
  | 'ORDEN_INSPECCION'
  | 'OTRO'

export type CasillaNotificationStatus =
  | 'RECIBIDA' // recién ingresada
  | 'ANALIZADA' // pasó por el agente
  | 'DESCARGO_PENDIENTE' // esperando descargo
  | 'DESCARGO_PRESENTADO'
  | 'RESUELTA'
  | 'ARCHIVADA'

export interface SunafilNotification {
  id: string
  orgId: string
  /** Número oficial de la notificación */
  numeroOficial: string
  /** Tipo */
  tipo: CasillaNotificationType
  /** Fecha que SUNAFIL emitió la notificación */
  fechaNotificacion: string // YYYY-MM-DD
  /** Fecha en que la casilla recibió */
  fechaIngreso: string
  /** Intendencia regional */
  intendenciaRegional?: string
  /** Inspector responsable */
  inspector?: string
  /** Asunto/descripción breve */
  asunto: string
  /** URL o base64 del PDF adjunto */
  documentoUrl?: string
  /** Plazo para responder (días hábiles) */
  plazoDiasHabiles: number
  /** Fecha límite calculada */
  fechaLimite?: string
  /** Estado actual */
  status: CasillaNotificationStatus
  /** Multa potencial si aplica (calculada por el agente) */
  multaPotencialSoles?: number
  /** Datos del análisis del agente (JSON serializado) */
  analysisData?: unknown
  createdAt: Date
  updatedAt: Date
}

// =============================================
// ADAPTER INTERFACE
// =============================================

export interface CasillaAdapter {
  readonly slug: string
  readonly name: string
  /** Fetch de notificaciones nuevas desde la casilla */
  poll(orgId: string, credentials?: Record<string, string>): Promise<SunafilNotification[]>
}

// =============================================
// MOCK ADAPTER (para dev / demos)
// =============================================

export class MockCasillaAdapter implements CasillaAdapter {
  readonly slug = 'mock'
  readonly name = 'Casilla SUNAFIL (simulada)'

  async poll(orgId: string): Promise<SunafilNotification[]> {
    // Genera 0-1 notificación random para demo
    const roll = Math.random()
    if (roll > 0.3) return []
    return [
      {
        id: randomUUID(),
        orgId,
        numeroOficial: `SF-${Math.floor(Math.random() * 900000 + 100000)}-2026`,
        tipo: 'ACTA_INSPECCION',
        fechaNotificacion: new Date().toISOString().slice(0, 10),
        fechaIngreso: new Date().toISOString().slice(0, 10),
        intendenciaRegional: 'Lima Metropolitana',
        inspector: 'Inspector Mock',
        asunto: 'Acta de inspección por verificación de planilla electrónica y pago de beneficios sociales',
        plazoDiasHabiles: 15,
        status: 'RECIBIDA',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  }
}

// =============================================
// STORE (in-memory)
// =============================================

const notificationsStore = new Map<string, SunafilNotification[]>() // key: orgId

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

export function ingestNotification(
  input: Omit<SunafilNotification, 'id' | 'createdAt' | 'updatedAt' | 'fechaLimite' | 'status'> & {
    status?: CasillaNotificationStatus
  }
): SunafilNotification {
  const id = randomUUID()
  let fechaLimite: string | undefined
  try {
    const base = new Date(input.fechaNotificacion)
    if (!isNaN(base.getTime())) {
      fechaLimite = addBusinessDays(base, input.plazoDiasHabiles).toISOString().slice(0, 10)
    }
  } catch {
    /* ignore */
  }

  const notification: SunafilNotification = {
    ...input,
    id,
    status: input.status || 'RECIBIDA',
    fechaLimite,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const list = notificationsStore.get(input.orgId) || []
  list.unshift(notification)
  notificationsStore.set(input.orgId, list)
  return notification
}

export function listNotifications(
  orgId: string,
  opts?: { status?: CasillaNotificationStatus; tipo?: CasillaNotificationType }
): SunafilNotification[] {
  let list = notificationsStore.get(orgId) || []
  if (opts?.status) list = list.filter(n => n.status === opts.status)
  if (opts?.tipo) list = list.filter(n => n.tipo === opts.tipo)
  return list
}

export function getNotification(orgId: string, id: string): SunafilNotification | undefined {
  return (notificationsStore.get(orgId) || []).find(n => n.id === id)
}

export function updateNotification(
  orgId: string,
  id: string,
  patch: Partial<SunafilNotification>
): SunafilNotification | null {
  const list = notificationsStore.get(orgId) || []
  const idx = list.findIndex(n => n.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date() }
  notificationsStore.set(orgId, list)
  return list[idx]
}

// =============================================
// RESUMEN
// =============================================

export interface CasillaSummary {
  total: number
  pendientes: number
  descargoVencenPronto: number // vencen en ≤3 días
  conMultaPotencial: number
  multaPotencialTotalSoles: number
  ultimaNotificacion?: string
}

export function getCasillaSummary(orgId: string): CasillaSummary {
  const list = notificationsStore.get(orgId) || []
  const now = new Date()
  const en3Dias = new Date(now.getTime() + 3 * 24 * 3600 * 1000)

  let descargoVencenPronto = 0
  let multaTotal = 0
  let conMulta = 0

  for (const n of list) {
    if (n.fechaLimite) {
      const fl = new Date(n.fechaLimite)
      if (
        (n.status === 'RECIBIDA' || n.status === 'ANALIZADA' || n.status === 'DESCARGO_PENDIENTE') &&
        fl <= en3Dias &&
        fl >= now
      ) {
        descargoVencenPronto++
      }
    }
    if (n.multaPotencialSoles && n.multaPotencialSoles > 0) {
      conMulta++
      multaTotal += n.multaPotencialSoles
    }
  }

  return {
    total: list.length,
    pendientes: list.filter(
      n => n.status === 'RECIBIDA' || n.status === 'ANALIZADA' || n.status === 'DESCARGO_PENDIENTE'
    ).length,
    descargoVencenPronto,
    conMultaPotencial: conMulta,
    multaPotencialTotalSoles: multaTotal,
    ultimaNotificacion: list[0]?.fechaIngreso,
  }
}
