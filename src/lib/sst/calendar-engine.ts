/**
 * Motor de reglas del Calendarizador SST.
 *
 * Función pura: dado un snapshot del estado SST de una org y la fecha actual,
 * decide qué alertas deben existir. NO hace I/O — el caller (endpoint cron)
 * es responsable de crear/upsertar las alertas en `WorkerAlert`.
 *
 * Reglas implementadas:
 *   - EMO_VENCIDO: EMOs con proximoExamenAntes < now
 *   - EMO_PROXIMO: EMOs con proximoExamenAntes en los próximos 30 días
 *   - IPERC_VENCIDO: IPERCBase VIGENTE con fechaAprobacion + 1 año < now
 *     (Ley 29783 + R.M. 050-2013-TR — revisión anual mínima)
 *   - SAT_PLAZO_VENCIDO: Accidente no NOTIFICADO con plazo (fechaHora +
 *     plazoLegalHoras) < now
 *   - SAT_PLAZO_PROXIMO: Accidente no NOTIFICADO con plazo en próximas 24h
 *   - COMITE_MANDATO_VENCE: ComiteSST VIGENTE con mandatoFin en próximos 60 días
 *
 * Determinístico, testeable. La función NO conoce orgId — quien la invoca
 * agrupa por org y persiste alertas separadas por organización.
 */

export type WorkerAlertType =
  | 'IPERC_VENCIDO'
  | 'EMO_PROXIMO'
  | 'EMO_VENCIDO'
  | 'SAT_PLAZO_PROXIMO'
  | 'SAT_PLAZO_VENCIDO'
  | 'COMITE_REUNION_PENDIENTE'
  | 'COMITE_MANDATO_VENCE'
  | 'SIMULACRO_PENDIENTE'

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface SstSnapshot {
  emos: Array<{
    id: string
    workerId: string
    proximoExamenAntes: Date | null
  }>
  ipercBases: Array<{
    id: string
    sedeId: string
    estado: 'BORRADOR' | 'REVISION' | 'VIGENTE' | 'VENCIDO' | 'ARCHIVADO'
    fechaAprobacion: Date | null
  }>
  accidentes: Array<{
    id: string
    workerId: string | null
    fechaHora: Date
    plazoLegalHoras: number
    satEstado: 'PENDIENTE' | 'EN_PROCESO' | 'NOTIFICADO' | 'CONFIRMADO' | 'RECHAZADO'
  }>
  comites: Array<{
    id: string
    estado: 'VIGENTE' | 'EN_ELECCION' | 'INACTIVO'
    mandatoFin: Date
  }>
}

export interface AlertaProyectada {
  type: WorkerAlertType
  severity: AlertSeverity
  /** workerId asociado (si la alerta es por trabajador). */
  workerId: string | null
  title: string
  description: string
  dueDate: Date | null
  /**
   * Identificador estable derivado del recurso para deduplicación.
   * Útil para upsert sin crear duplicados en el cron diario.
   */
  fingerprint: string
}

const MS_DAY = 24 * 60 * 60 * 1000

/** EMO_PROXIMO se dispara cuando el próximo examen está en ≤30 días. */
const EMO_DIAS_UMBRAL = 30
/** IPERC_VENCIDO si han pasado más de 365 días desde la aprobación. */
const IPERC_VIGENCIA_DIAS = 365
/** SAT_PLAZO_PROXIMO si quedan ≤24h al deadline legal. */
const SAT_HORAS_PROXIMO = 24
/** COMITE_MANDATO_VENCE si quedan ≤60 días al fin del mandato (R.M. 245-2021-TR). */
const COMITE_DIAS_AVISO = 60

export function evaluarReglasSst(snapshot: SstSnapshot, now: Date = new Date()): AlertaProyectada[] {
  const alertas: AlertaProyectada[] = []

  // ── EMO ────────────────────────────────────────────────────────────────
  for (const emo of snapshot.emos) {
    if (!emo.proximoExamenAntes) continue
    const ms = emo.proximoExamenAntes.getTime() - now.getTime()
    if (ms < 0) {
      alertas.push({
        type: 'EMO_VENCIDO',
        severity: 'HIGH',
        workerId: emo.workerId,
        title: 'EMO vencido',
        description: `El examen médico ocupacional venció el ${emo.proximoExamenAntes.toLocaleDateString('es-PE')}. Programa uno nuevo para evitar sanciones (R.M. 312-2011-MINSA).`,
        dueDate: emo.proximoExamenAntes,
        fingerprint: `EMO_VENCIDO:${emo.id}`,
      })
    } else if (ms <= EMO_DIAS_UMBRAL * MS_DAY) {
      alertas.push({
        type: 'EMO_PROXIMO',
        severity: 'MEDIUM',
        workerId: emo.workerId,
        title: 'EMO próximo a vencer',
        description: `El examen médico ocupacional vence el ${emo.proximoExamenAntes.toLocaleDateString('es-PE')}. Coordina la cita con el centro DIGESA.`,
        dueDate: emo.proximoExamenAntes,
        fingerprint: `EMO_PROXIMO:${emo.id}`,
      })
    }
  }

  // ── IPERC_VENCIDO ──────────────────────────────────────────────────────
  for (const ip of snapshot.ipercBases) {
    if (ip.estado !== 'VIGENTE' || !ip.fechaAprobacion) continue
    const dias = (now.getTime() - ip.fechaAprobacion.getTime()) / MS_DAY
    if (dias > IPERC_VIGENCIA_DIAS) {
      alertas.push({
        type: 'IPERC_VENCIDO',
        severity: 'HIGH',
        workerId: null,
        title: 'IPERC vencido — requiere revisión anual',
        description: `La matriz IPERC fue aprobada el ${ip.fechaAprobacion.toLocaleDateString('es-PE')} (hace ${Math.floor(dias)} días). La Ley 29783 obliga a revisarla mínimo una vez al año.`,
        dueDate: new Date(ip.fechaAprobacion.getTime() + IPERC_VIGENCIA_DIAS * MS_DAY),
        fingerprint: `IPERC_VENCIDO:${ip.id}`,
      })
    }
  }

  // ── SAT (Accidentes) ───────────────────────────────────────────────────
  const ESTADOS_NOTIFICADO = new Set(['NOTIFICADO', 'CONFIRMADO'])
  for (const a of snapshot.accidentes) {
    if (ESTADOS_NOTIFICADO.has(a.satEstado)) continue
    const deadline = new Date(a.fechaHora.getTime() + a.plazoLegalHoras * 60 * 60 * 1000)
    const ms = deadline.getTime() - now.getTime()
    if (ms < 0) {
      alertas.push({
        type: 'SAT_PLAZO_VENCIDO',
        severity: 'CRITICAL',
        workerId: a.workerId,
        title: 'Notificación SAT vencida',
        description: `El plazo legal SAT venció el ${deadline.toLocaleString('es-PE')} (D.S. 006-2022-TR). Documenta la notificación o registra el cargo en el wizard SAT.`,
        dueDate: deadline,
        fingerprint: `SAT_VENCIDO:${a.id}`,
      })
    } else if (ms <= SAT_HORAS_PROXIMO * 60 * 60 * 1000) {
      alertas.push({
        type: 'SAT_PLAZO_PROXIMO',
        severity: 'CRITICAL',
        workerId: a.workerId,
        title: 'Notificación SAT en plazo crítico (≤24h)',
        description: `Tienes hasta el ${deadline.toLocaleString('es-PE')} para notificar a SAT. Descarga el PDF pre-llenado y carga el comprobante.`,
        dueDate: deadline,
        fingerprint: `SAT_PROXIMO:${a.id}`,
      })
    }
  }

  // ── Comité SST ─────────────────────────────────────────────────────────
  for (const c of snapshot.comites) {
    if (c.estado !== 'VIGENTE') continue
    const dias = (c.mandatoFin.getTime() - now.getTime()) / MS_DAY
    if (dias <= COMITE_DIAS_AVISO && dias >= 0) {
      alertas.push({
        type: 'COMITE_MANDATO_VENCE',
        severity: dias <= 14 ? 'HIGH' : 'MEDIUM',
        workerId: null,
        title: 'Mandato del Comité SST por vencer',
        description: `El mandato del Comité SST vence el ${c.mandatoFin.toLocaleDateString('es-PE')} (en ${Math.floor(dias)} días). Programa elecciones del próximo periodo (R.M. 245-2021-TR).`,
        dueDate: c.mandatoFin,
        fingerprint: `COMITE_MANDATO_VENCE:${c.id}`,
      })
    }
  }

  return alertas
}

/**
 * Resumen para el dashboard / endpoint preview: agrupa por type + severity.
 */
export function resumirAlertas(alertas: AlertaProyectada[]): {
  total: number
  byType: Record<WorkerAlertType, number>
  bySeverity: Record<AlertSeverity, number>
} {
  const byType = {} as Record<WorkerAlertType, number>
  const bySeverity = {} as Record<AlertSeverity, number>
  for (const a of alertas) {
    byType[a.type] = (byType[a.type] ?? 0) + 1
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1
  }
  return { total: alertas.length, byType, bySeverity }
}
