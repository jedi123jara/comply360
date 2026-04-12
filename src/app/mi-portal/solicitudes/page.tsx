'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'

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

const STATUS_INFO: Record<string, { label: string; class: string; icon: typeof Clock }> = {
  PENDIENTE: { label: 'Pendiente', class: 'bg-amber-100 text-amber-700', icon: Clock },
  EN_REVISION: { label: 'En revisión', class: 'bg-blue-100 text-blue-700', icon: Clock },
  APROBADA: { label: 'Aprobada', class: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', class: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELADA: { label: 'Cancelada', class: 'bg-slate-100 text-slate-600', icon: XCircle },
}

export default function SolicitudesPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-portal/solicitudes')
      .then((r) => r.json())
      .then((d) => setItems(d.requests || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis Solicitudes</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona vacaciones, permisos, certificados y otros tramites.
          </p>
        </div>
        <Link
          href="/mi-portal/solicitudes/nueva"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva solicitud
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No has hecho solicitudes todavia.</p>
          <Link
            href="/mi-portal/solicitudes/nueva"
            className="inline-block mt-4 text-blue-600 hover:underline text-sm font-medium"
          >
            Crear tu primera solicitud
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((req) => {
            const status = STATUS_INFO[req.status] || STATUS_INFO.PENDIENTE
            const StatusIcon = status.icon
            return (
              <li
                key={req.id}
                className="bg-[#141824] border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase font-semibold text-blue-700">
                          {TYPE_LABEL[req.type] || req.type}
                        </p>
                        <h3 className="font-semibold text-slate-900 mt-0.5">{req.title}</h3>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${status.class}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    {req.description && (
                      <p className="text-sm text-slate-600 mt-2">{req.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                      {req.startDate && req.endDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(req.startDate).toLocaleDateString('es-PE')} – {new Date(req.endDate).toLocaleDateString('es-PE')}
                          {req.daysRequested && ` (${req.daysRequested} dias)`}
                        </span>
                      )}
                      <span>
                        Solicitado: {new Date(req.createdAt).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                    {req.reviewNotes && (
                      <div className="mt-2 bg-slate-50 border-l-2 border-blue-400 p-2 text-xs text-slate-700">
                        <strong>Nota de RRHH:</strong> {req.reviewNotes}
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
