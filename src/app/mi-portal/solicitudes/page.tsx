'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { PageHeader, EmptyState, ErrorState, Chip, ListSkeleton } from '@/components/mi-portal'
import { formatShortDate } from '@/lib/format/peruvian'

interface RequestItem {
  id: string
  type: string
  status: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  daysRequested: number | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}

const TYPE_LABEL: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  PERMISO: 'Permiso',
  LICENCIA_MEDICA: 'Licencia médica',
  LICENCIA_MATERNIDAD: 'Licencia maternidad',
  LICENCIA_PATERNIDAD: 'Licencia paternidad',
  ADELANTO_SUELDO: 'Adelanto de sueldo',
  CTS_RETIRO_PARCIAL: 'Retiro parcial CTS',
  CONSTANCIA_TRABAJO: 'Constancia de trabajo',
  CERTIFICADO_5TA: 'Certificado de 5ta',
  ACTUALIZAR_DATOS: 'Actualizar datos',
  OTRO: 'Otro',
}

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const STATUS_INFO: Record<string, { label: string; variant: Variant; icon: typeof Clock }> = {
  PENDIENTE: { label: 'Pendiente', variant: 'warning', icon: Clock },
  EN_REVISION: { label: 'En revisión', variant: 'info', icon: Clock },
  APROBADA: { label: 'Aprobada', variant: 'success', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', variant: 'danger', icon: XCircle },
  CANCELADA: { label: 'Cancelada', variant: 'neutral', icon: XCircle },
}

export default function SolicitudesPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mi-portal/solicitudes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mis solicitudes"
        subtitle="Gestiona vacaciones, permisos, certificados y otros trámites."
        action={
          <Link
            href="/mi-portal/solicitudes/nueva"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg min-h-[44px] transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </Link>
        }
      />

      {loading && <ListSkeleton rows={4} />}

      {error && !loading && (
        <ErrorState title="No se pudieron cargar las solicitudes" message={error} onRetry={load} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6" />}
          title="Aún no tienes solicitudes"
          description="Pide vacaciones, permisos o certificados desde acá. La respuesta de RRHH llega por este mismo canal."
          action={
            <Link
              href="/mi-portal/solicitudes/nueva"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Crear tu primera solicitud
            </Link>
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((req) => {
            const status = STATUS_INFO[req.status] ?? STATUS_INFO.PENDIENTE
            const StatusIcon = status.icon
            return (
              <li
                key={req.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[11px] uppercase font-bold text-emerald-700 tracking-wide">
                          {TYPE_LABEL[req.type] ?? req.type}
                        </p>
                        <h3 className="font-semibold text-slate-900 mt-0.5">{req.title}</h3>
                      </div>
                      <Chip variant={status.variant} icon={<StatusIcon className="w-3 h-3" />}>
                        {status.label}
                      </Chip>
                    </div>
                    {req.description && (
                      <p className="text-sm text-slate-600 mt-2">{req.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                      {req.startDate && req.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatShortDate(req.startDate)} – {formatShortDate(req.endDate)}
                          {req.daysRequested ? ` (${req.daysRequested} días)` : ''}
                        </span>
                      )}
                      <span>Solicitado: {formatShortDate(req.createdAt)}</span>
                    </div>
                    {req.reviewNotes && (
                      <div className="mt-3 bg-slate-50 border-l-2 border-emerald-500 p-2.5 text-xs text-slate-700 rounded-r">
                        <strong className="text-slate-900">Nota de RRHH:</strong> {req.reviewNotes}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
