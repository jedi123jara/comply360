'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, CheckCircle2, XCircle, Clock, Loader2,
  AlertTriangle, Filter, RefreshCw, User, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkerInfo {
  id: string
  name: string
  dni: string
  position: string | null
  department: string | null
}

interface Request {
  id: string
  type: string
  status: string
  description: string | null
  startDate: string | null
  endDate: string | null
  daysRequested: number | null
  amount: number | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  worker: WorkerInfo | null
}

const TYPE_LABELS: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  PERMISO: 'Permiso',
  LICENCIA_MEDICA: 'Licencia médica',
  LICENCIA_MATERNIDAD: 'Licencia maternidad',
  LICENCIA_PATERNIDAD: 'Licencia paternidad',
  ADELANTO_SUELDO: 'Adelanto de sueldo',
  CTS_RETIRO_PARCIAL: 'Retiro parcial CTS',
  CONSTANCIA_TRABAJO: 'Constancia de trabajo',
  CERTIFICADO_5TA: 'Certificado 5ta categoría',
  ACTUALIZAR_DATOS: 'Actualización de datos',
  OTRO: 'Otro',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400', icon: Clock },
  EN_REVISION: { label: 'En revisión', color: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400', icon: XCircle },
  CANCELADA: { label: 'Cancelada', color: 'bg-white/[0.04] text-gray-600 bg-gray-800 text-gray-400', icon: XCircle },
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  request,
  onClose,
  onDone,
}: {
  request: Request
  onClose: () => void
  onDone: () => void
}) {
  const [action, setAction] = useState<'APROBADA' | 'RECHAZADA' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!action) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workers/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id, action, reviewNotes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al procesar'); return }
      onDone()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#141824] bg-slate-900 shadow-2xl">
        <div className="p-6 border-b border-white/[0.06] border-white/[0.08]">
          <h2 className="text-lg font-bold text-white">
            Revisar Solicitud — {TYPE_LABELS[request.type] || request.type}
          </h2>
          <p className="text-sm text-gray-500 text-gray-400 mt-0.5">
            Solicitado por: {request.worker?.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Request details */}
          <div className="rounded-xl bg-white/[0.02] bg-[#141824] p-4 space-y-2 text-sm">
            {request.startDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha inicio:</span>
                <span className="font-medium text-white">
                  {new Date(request.startDate).toLocaleDateString('es-PE')}
                </span>
              </div>
            )}
            {request.endDate && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha fin:</span>
                <span className="font-medium text-white">
                  {new Date(request.endDate).toLocaleDateString('es-PE')}
                </span>
              </div>
            )}
            {request.daysRequested && (
              <div className="flex justify-between">
                <span className="text-gray-500">Días solicitados:</span>
                <span className="font-medium text-white">{request.daysRequested}</span>
              </div>
            )}
            {request.amount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Monto:</span>
                <span className="font-medium text-white">
                  S/ {Number(request.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {request.description && (
              <div>
                <span className="text-gray-500">Descripción:</span>
                <p className="mt-1 text-gray-300 text-slate-300">{request.description}</p>
              </div>
            )}
          </div>

          {/* Action selection */}
          <div className="flex gap-3">
            <button
              onClick={() => setAction('APROBADA')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all',
                action === 'APROBADA'
                  ? 'border-emerald-500 bg-emerald-50 bg-emerald-900/20 text-emerald-700 text-emerald-400'
                  : 'border-white/[0.08] text-slate-300 hover:border-emerald-300'
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar
            </button>
            <button
              onClick={() => setAction('RECHAZADA')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all',
                action === 'RECHAZADA'
                  ? 'border-red-500 bg-red-50 bg-red-900/20 text-red-700 text-red-400'
                  : 'border-white/[0.08] text-slate-300 hover:border-red-300'
              )}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 text-slate-300 mb-1">
              Notas de revisión {action === 'RECHAZADA' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={action === 'RECHAZADA' ? 'Explica el motivo del rechazo...' : 'Comentario opcional...'}
              rows={3}
              className="w-full rounded-lg border border-white/[0.08] bg-[#141824] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 bg-red-900/20 border border-red-200 border-red-800 px-3 py-2 text-sm text-red-700 text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-gray-300 text-slate-300 hover:bg-white/[0.02] hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={!action || loading || (action === 'RECHAZADA' && !reviewNotes.trim())}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50',
                action === 'APROBADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {action === 'APROBADA' ? 'Confirmar aprobación' : action === 'RECHAZADA' ? 'Confirmar rechazo' : 'Selecciona una acción'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SolicitudesPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDIENTE')
  const [reviewingRequest, setReviewingRequest] = useState<Request | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workers/requests?status=${statusFilter}&limit=50`)
      const data = await res.json()
      setRequests(data.requests || [])
      setPendingCount(data.pendingCount || 0)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Solicitudes de Trabajadores</h1>
          <p className="mt-1 text-sm text-gray-500 text-gray-400">
            Gestiona vacaciones, permisos, licencias y otras solicitudes del portal empleado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 bg-amber-900/30 px-3 py-1.5 text-sm font-semibold text-amber-700 text-amber-400">
              <Clock className="h-4 w-4" />
              {pendingCount} pendientes
            </span>
          )}
          <button onClick={load} className="rounded-xl border border-white/[0.08] p-2.5 hover:bg-white/[0.02] hover:bg-slate-800">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'PENDIENTE', label: 'Pendientes' },
          { value: 'APROBADA', label: 'Aprobadas' },
          { value: 'RECHAZADA', label: 'Rechazadas' },
          { value: 'all', label: 'Todas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all',
              statusFilter === f.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-white/[0.08] text-slate-300 hover:bg-white/[0.02] hover:bg-slate-800'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300 text-slate-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 text-gray-400">
            No hay solicitudes con este filtro.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] border-white/[0.08] bg-[#141824] shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 divide-slate-700">
            <thead className="bg-white/[0.02] bg-white/[0.04]/50">
              <tr>
                {['Trabajador', 'Tipo', 'Período', 'Estado', 'Fecha solicitud', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 divide-slate-700/50">
              {requests.map((req) => {
                const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDIENTE
                const StatusIcon = statusCfg.icon
                return (
                  <tr key={req.id} className="hover:bg-white/[0.02] hover:bg-white/[0.04]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 bg-indigo-900/30">
                          <User className="h-4 w-4 text-indigo-600 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {req.worker?.name || '—'}
                          </p>
                          <p className="text-xs text-gray-400 text-slate-500">
                            {req.worker?.position || req.worker?.department || req.worker?.dni || ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-slate-300">
                      {TYPE_LABELS[req.type] || req.type}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {req.startDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(req.startDate).toLocaleDateString('es-PE')}
                          {req.endDate && ` → ${new Date(req.endDate).toLocaleDateString('es-PE')}`}
                          {req.daysRequested && ` (${req.daysRequested}d)`}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', statusCfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-gray-400">
                      {new Date(req.createdAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'PENDIENTE' || req.status === 'EN_REVISION' ? (
                        <button
                          onClick={() => setReviewingRequest(req)}
                          className="rounded-lg bg-indigo-50 bg-indigo-900/20 hover:bg-indigo-100 hover:bg-indigo-900/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 text-indigo-400"
                        >
                          Revisar
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 text-slate-500">
                          {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString('es-PE') : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {reviewingRequest && (
        <ReviewModal
          request={reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
