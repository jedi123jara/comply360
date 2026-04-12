'use client'

import { useEffect, useState } from 'react'
import { Inbox, AlertTriangle, Clock, Loader2, RefreshCw, Upload } from 'lucide-react'

interface Notification {
  id: string
  numeroOficial: string
  tipo: string
  fechaNotificacion: string
  fechaIngreso: string
  fechaLimite?: string
  asunto: string
  inspector?: string
  intendenciaRegional?: string
  plazoDiasHabiles: number
  status: string
  multaPotencialSoles?: number
  documentoUrl?: string
}

interface Summary {
  total: number
  pendientes: number
  descargoVencenPronto: number
  conMultaPotencial: number
  multaPotencialTotalSoles: number
  ultimaNotificacion?: string
}

const STATUS_COLORS: Record<string, string> = {
  RECIBIDA: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  ANALIZADA: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  DESCARGO_PENDIENTE: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  DESCARGO_PRESENTADO: 'bg-green-500/15 text-green-300 border-green-500/30',
  RESUELTA: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
}

export default function CasillaPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/casilla/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setSummary(data.summary || null)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gold-500/10 p-3">
            <Inbox className="h-7 w-7 text-gold-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Casilla Electrónica SUNAFIL</h1>
              <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400">
                PLANAPP 2026
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Centraliza todas las notificaciones de SUNAFIL. Cada nueva notificación dispara
              automáticamente el Agente Analizador SUNAFIL y programa recordatorios antes del
              vencimiento del plazo de descargo.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total" value={summary.total} color="text-white" />
          <Stat label="Pendientes" value={summary.pendientes} color="text-yellow-400" />
          <Stat
            label="Vencen en ≤3 días"
            value={summary.descargoVencenPronto}
            color="text-red-400"
            icon={<Clock className="h-5 w-5 text-red-400" />}
          />
          <Stat
            label="Multa expuesta"
            value={`S/ ${summary.multaPotencialTotalSoles.toLocaleString('es-PE')}`}
            color="text-gold-400"
            icon={<AlertTriangle className="h-5 w-5 text-gold-400" />}
          />
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <Inbox className="mx-auto h-14 w-14 text-slate-600" />
          <p className="mt-4 text-sm text-slate-400">
            No hay notificaciones en la casilla. Cuando SUNAFIL te envíe un acta, aparecerá aquí
            automáticamente.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Configura el proveedor de monitoreo de casilla en Integraciones o sube manualmente una
            notificación recibida por email.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-gold-500/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        STATUS_COLORS[n.status] || STATUS_COLORS.RECIBIDA
                      }`}
                    >
                      {n.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                      {n.tipo.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{n.numeroOficial}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{n.asunto}</p>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>📅 Notificado: {n.fechaNotificacion}</span>
                    {n.fechaLimite && (
                      <span className="text-orange-400">⏰ Vence: {n.fechaLimite}</span>
                    )}
                    {n.inspector && <span>👤 {n.inspector}</span>}
                    {n.intendenciaRegional && <span>📍 {n.intendenciaRegional}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href="/dashboard/agentes/sunafil"
                    className="rounded-lg bg-gold-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-gold-400"
                  >
                    Analizar con IA
                  </a>
                  {n.documentoUrl && (
                    <a
                      href={n.documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Ver PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-5 text-xs text-slate-300">
        <p>
          <b className="text-gold-400">Casilla Electrónica SUNAFIL:</b> desde 2026 es obligatoria.
          Las notificaciones tienen el mismo valor legal que una cédula física y el plazo corre
          desde la fecha de ingreso. No revisar tu casilla diariamente es la causa #1 de
          notificaciones perdidas y multas que llegan sin posibilidad de descargo. COMPLY360
          centraliza todas las comunicaciones en este panel.
        </p>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number | string
  color: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
