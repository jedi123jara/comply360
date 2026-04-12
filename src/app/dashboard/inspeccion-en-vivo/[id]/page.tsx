'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Siren, ArrowLeft, Download, Loader2, Play,
  CheckCircle2, XCircle, MinusCircle, HelpCircle,
  Shield, Clock, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SolicitudInspector, HallazgoInspeccion, ResultadoSimulacro } from '@/lib/compliance/simulacro-engine'

interface SessionDetail {
  id: string
  tipo: string
  status: string
  inspectorName: string | null
  inspectorDNI: string | null
  ordenInspeccion: string | null
  startedAt: string
  completedAt: string | null
  scoreInspeccion: number | null
  multaEstimada: number | null
  notes: string | null
  solicitudes: SolicitudInspector[]
  hallazgos: HallazgoInspeccion[]
  evidencias: Record<string, string[]>
  resultado: ResultadoSimulacro | null
}

const ESTADO_CONFIG = {
  CUMPLE:    { icon: CheckCircle2, label: 'Cumple', color: 'text-emerald-600 bg-emerald-50' },
  PARCIAL:   { icon: MinusCircle, label: 'Parcial', color: 'text-amber-600 bg-amber-50' },
  NO_CUMPLE: { icon: XCircle, label: 'Incumple', color: 'text-red-600 bg-red-50' },
  NO_APLICA: { icon: HelpCircle, label: 'N/A', color: 'text-gray-400 bg-white/[0.02]' },
} as const

export default function InspeccionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/inspeccion-en-vivo/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d as SessionDetail))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleResume = async () => {
    await fetch(`/api/inspeccion-en-vivo/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    })
    router.push('/dashboard/inspeccion-en-vivo')
  }

  const handleDownloadPDF = async () => {
    const res = await fetch(`/api/inspeccion-en-vivo/${id}/pdf`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Inspeccion_${id.slice(-8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Sesion no encontrada</p>
        <Link href="/dashboard/inspeccion-en-vivo" className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </div>
    )
  }

  const score = data.scoreInspeccion ?? data.resultado?.scoreSimulacro ?? 0
  const multa = data.multaEstimada ?? data.resultado?.multaTotal ?? 0
  const hallazgos = data.hallazgos ?? []
  const cumple = hallazgos.filter(h => h.estado === 'CUMPLE').length
  const parcial = hallazgos.filter(h => h.estado === 'PARCIAL').length
  const noCumple = hallazgos.filter(h => h.estado === 'NO_CUMPLE').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/inspeccion-en-vivo" className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Inspecciones
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Inspeccion {data.tipo}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(data.startedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {data.inspectorName && <span>Inspector: {data.inspectorName}</span>}
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              data.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
              data.status === 'ACTIVE' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700',
            )}>
              {data.status === 'COMPLETED' ? 'Finalizada' : data.status === 'ACTIVE' ? 'En curso' : 'Pausada'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.status === 'PAUSED' && (
            <button type="button" onClick={handleResume}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
              <Play className="h-4 w-4" /> Reanudar
            </button>
          )}
          {data.status === 'COMPLETED' && (
            <button type="button" onClick={handleDownloadPDF}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90">
              <Download className="h-4 w-4" /> Descargar PDF
            </button>
          )}
        </div>
      </div>

      {/* Score */}
      {data.status === 'COMPLETED' && (
        <div className={cn(
          'rounded-xl p-6 text-center border',
          score >= 80 ? 'bg-emerald-50 border-emerald-200' : score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200',
        )}>
          <p className={cn('text-4xl font-bold', score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600')}>
            {score}/100
          </p>
          <p className="text-sm text-gray-600 mt-1">Multa estimada: S/ {Number(multa).toLocaleString('es-PE')}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#141824] border border-white/[0.08] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{cumple}</p>
          <p className="text-xs text-gray-500">Cumple</p>
        </div>
        <div className="rounded-xl bg-[#141824] border border-white/[0.08] p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{parcial}</p>
          <p className="text-xs text-gray-500">Parcial</p>
        </div>
        <div className="rounded-xl bg-[#141824] border border-white/[0.08] p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{noCumple}</p>
          <p className="text-xs text-gray-500">Incumple</p>
        </div>
        <div className="rounded-xl bg-[#141824] border border-white/[0.08] p-4 text-center">
          <p className="text-2xl font-bold text-white">{hallazgos.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>

      {/* Hallazgos table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm overflow-hidden">
        <div className="border-b border-white/[0.08] px-6 py-4">
          <h2 className="text-base font-semibold text-white">Hallazgos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] bg-white/[0.04]/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-400">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-400">Documento</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 text-gray-400">Base Legal</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 text-gray-400">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 text-gray-400">Gravedad</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 text-gray-400">Multa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {hallazgos.map((h, i) => {
                const cfg = ESTADO_CONFIG[h.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.NO_APLICA
                const Icon = cfg.icon
                return (
                  <tr key={h.solicitudId} className="hover:bg-white/[0.02]/50 hover:bg-white/[0.04]/30">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{h.documentoLabel}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-gray-400 text-xs">{h.baseLegal}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
                        <Icon className="h-3 w-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs">{h.gravedad}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600 tabular-nums">
                      {h.multaPEN > 0 ? `S/ ${h.multaPEN.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
