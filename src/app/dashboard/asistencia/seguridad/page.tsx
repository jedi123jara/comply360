'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  Smartphone,
  Globe,
  Clock,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import { EmptyState } from '@/components/ui/empty-state'

// ── Types ──────────────────────────────────────────
type AttemptResult =
  | 'SUCCESS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'ORG_MISMATCH'
  | 'GEOFENCE_OUT'
  | 'GEOLOCATION_REQUIRED'
  | 'PIN_WRONG'
  | 'RATE_LIMITED'
  | 'ALREADY_CLOCKED'
  | 'WORKER_NOT_FOUND'
  | 'ERROR'

interface Attempt {
  id: string
  workerId: string | null
  worker: { id: string; firstName: string; lastName: string; dni: string | null } | null
  result: AttemptResult
  reason: string | null
  via: string | null
  geo: { lat: number; lng: number; accuracy: number | null } | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface AttemptsResponse {
  range: { start: string; end: string }
  summary: { total: number; byResult: Record<string, number> }
  heatmap: Record<string, Record<string, number>>
  attempts: Attempt[]
}

const RESULT_CONFIG: Record<AttemptResult, { label: string; color: string; isFailure: boolean }> = {
  SUCCESS: { label: 'Exitosa', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', isFailure: false },
  TOKEN_EXPIRED: { label: 'Token expirado', color: 'bg-slate-50 text-slate-700 border-slate-200', isFailure: true },
  TOKEN_INVALID: { label: 'Token inválido', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
  ORG_MISMATCH: { label: 'Org distinta', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
  GEOFENCE_OUT: { label: 'Fuera de zona', color: 'bg-amber-50 text-amber-700 border-amber-200', isFailure: true },
  GEOLOCATION_REQUIRED: { label: 'Sin ubicación', color: 'bg-amber-50 text-amber-700 border-amber-200', isFailure: true },
  PIN_WRONG: { label: 'PIN incorrecto', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
  RATE_LIMITED: { label: 'Rate limited', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
  ALREADY_CLOCKED: { label: 'Ya marcó', color: 'bg-slate-50 text-slate-700 border-slate-200', isFailure: false },
  WORKER_NOT_FOUND: { label: 'Worker no existe', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
  ERROR: { label: 'Error', color: 'bg-red-50 text-red-700 border-red-200', isFailure: true },
}

const RESULT_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'SUCCESS', label: 'Exitosos' },
  { key: 'GEOFENCE_OUT', label: 'Fuera de zona' },
  { key: 'TOKEN_EXPIRED', label: 'Token expirado' },
  { key: 'PIN_WRONG', label: 'PIN incorrecto' },
]

export default function AsistenciaSeguridadPage() {
  const [data, setData] = useState<AttemptsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [days, setDays] = useState<number>(7)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const end = new Date()
      const start = new Date(end)
      start.setDate(start.getDate() - days)
      const params = new URLSearchParams()
      params.set('startDate', start.toISOString().slice(0, 10))
      params.set('endDate', end.toISOString().slice(0, 10))
      if (filter !== 'all') params.set('result', filter)

      const res = await fetch(`/api/attendance/attempts?${params}`, { cache: 'no-store' })
      if (!res.ok) {
        setData(null)
      } else {
        const d = await res.json() as AttemptsResponse
        setData(d)
      }
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filter, days])

  useEffect(() => { void fetchData() }, [fetchData])

  const summary = data?.summary
  const success = summary?.byResult['SUCCESS'] ?? 0
  const failures = summary
    ? Object.entries(summary.byResult)
        .filter(([k]) => RESULT_CONFIG[k as AttemptResult]?.isFailure)
        .reduce((s, [, v]) => s + v, 0)
    : 0
  const geofenceOut = summary?.byResult['GEOFENCE_OUT'] ?? 0
  const tokenExpired = summary?.byResult['TOKEN_EXPIRED'] ?? 0

  const failureRate = summary && summary.total > 0
    ? Math.round((failures / summary.total) * 100)
    : 0

  // Heatmap: 24 horas × top 5 results más frecuentes
  const heatmapHours = Array.from({ length: 24 }, (_, h) => h)
  const heatmapResults: AttemptResult[] = ['SUCCESS', 'GEOFENCE_OUT', 'TOKEN_EXPIRED', 'PIN_WRONG']
  const heatmapData = data?.heatmap ?? {}
  const heatmapMax = Math.max(
    1,
    ...heatmapHours.flatMap(h =>
      heatmapResults.map(r => heatmapData[h.toString()]?.[r] ?? 0),
    ),
  )

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/asistencia"
        className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Asistencia
      </Link>

      <PageHeader
        eyebrow="Anti-fraude"
        title="Auditoría de <em>fichados</em>."
        subtitle="Cada intento de marcación queda registrado: exitosos, tokens expirados, fuera de zona, PIN incorrecto. Detecta patrones sospechosos antes que escalen."
      />

      {/* Filtros de rango */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Rango:</span>
        {[1, 7, 30].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              days === d
                ? 'bg-emerald-600 text-white'
                : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]',
            )}
          >
            {d === 1 ? 'Hoy' : `Últimos ${d}d`}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <KpiGrid>
        <KpiCard
          icon={ShieldCheck}
          label="Exitosos"
          value={success}
          variant="accent"
          footer={summary && summary.total > 0 ? `${Math.round((success / summary.total) * 100)}% del total` : 'Sin intentos aún'}
        />
        <KpiCard
          icon={ShieldAlert}
          label="Fallidos"
          value={failures}
          variant={failureRate > 20 ? 'crimson' : failureRate > 10 ? 'amber' : 'default'}
          footer={`${failureRate}% tasa de fallo`}
        />
        <KpiCard
          icon={MapPin}
          label="Fuera de zona"
          value={geofenceOut}
          variant={geofenceOut > 0 ? 'amber' : 'default'}
          footer="Posible suplantación"
        />
        <KpiCard
          icon={Clock}
          label="Token expirado"
          value={tokenExpired}
          footer="QR caducado al escanear"
        />
      </KpiGrid>

      {/* Filtros de resultado */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        {RESULT_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-emerald-600 text-white'
                : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]',
            )}
          >
            {f.label}
            {f.key !== 'all' && summary?.byResult[f.key]
              ? ` (${summary.byResult[f.key]})`
              : ''}
          </button>
        ))}
      </div>

      {/* Heatmap por hora del día */}
      {summary && summary.total > 0 && (
        <div className="bg-white rounded-2xl border border-[color:var(--border-default)] p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Distribución por hora del día
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase pr-3 pb-2">Hora</th>
                  {heatmapResults.map(r => (
                    <th key={r} className="text-center text-[10px] font-semibold text-slate-500 uppercase pb-2">
                      {RESULT_CONFIG[r].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapHours.map(h => {
                  const row = heatmapData[h.toString()] ?? {}
                  const total = heatmapResults.reduce((s, r) => s + (row[r] ?? 0), 0)
                  if (total === 0) return null
                  return (
                    <tr key={h}>
                      <td className="font-mono text-slate-600 pr-3 py-1">
                        {h.toString().padStart(2, '0')}:00
                      </td>
                      {heatmapResults.map(r => {
                        const count = row[r] ?? 0
                        const intensity = count / heatmapMax
                        const bg = count === 0
                          ? 'bg-slate-50'
                          : r === 'SUCCESS'
                            ? `bg-emerald-${intensity > 0.66 ? '600' : intensity > 0.33 ? '400' : '200'}`
                            : `bg-amber-${intensity > 0.66 ? '600' : intensity > 0.33 ? '400' : '200'}`
                        return (
                          <td key={r} className="text-center py-1">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-9 h-7 rounded text-[10px] font-mono font-semibold',
                                bg,
                                count > 0 && intensity > 0.5 ? 'text-white' : 'text-slate-700',
                              )}
                            >
                              {count > 0 ? count : ''}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de intentos */}
      <div className="bg-white rounded-2xl border border-[color:var(--border-default)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : !data || data.attempts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Sin intentos en este rango"
            description={
              filter === 'all'
                ? 'Cuando los trabajadores empiecen a fichar, los intentos aparecerán acá. Cubre exitosos y fallidos.'
                : 'Prueba ampliando el rango o cambiando el filtro.'
            }
            variant="light"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha / Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resultado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalle</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vía</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-default)]">
                {data.attempts.map(a => {
                  const cfg = RESULT_CONFIG[a.result]
                  const date = new Date(a.createdAt)
                  return (
                    <tr key={a.id} className="hover:bg-[color:var(--neutral-50)]">
                      <td className="px-4 py-3 text-sm font-mono text-slate-700 whitespace-nowrap">
                        {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        <span className="text-slate-400 mx-1">·</span>
                        {date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        {a.worker ? (
                          <Link
                            href={`/dashboard/trabajadores/${a.worker.id}`}
                            className="text-sm font-medium text-slate-900 hover:text-emerald-700"
                          >
                            {displayWorkerName(a.worker.firstName, a.worker.lastName)}
                            <span className="block text-[11px] text-slate-500 font-mono">DNI {a.worker.dni ?? '—'}</span>
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-500 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.color)}>
                          {a.result === 'SUCCESS' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-md truncate" title={a.reason ?? undefined}>
                        {a.reason ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.via ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            {a.via === 'qr' ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {a.via.toUpperCase()}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {a.ipAddress ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota legal al pie */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-700 leading-relaxed">
          Los intentos se almacenan por 30 días con propósito anti-fraude (R.M. 037-2024-TR
          art. 5: "el sistema digital debe permitir auditar el control"). Después de ese plazo
          se eliminan automáticamente. El IP y user-agent se guardan junto con la coordenada
          GPS al momento del intento — útil para identificar patrones de suplantación.
        </p>
      </div>
    </div>
  )
}
