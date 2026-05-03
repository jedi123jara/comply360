'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Loader2, AlertCircle, Activity, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { calcularPlazoSat, evaluarCountdown, type TipoAccidente } from '@/lib/sst/sat-deadline'

interface AccidenteItem {
  id: string
  tipo: TipoAccidente
  fechaHora: string
  descripcion: string
  satEstado: 'PENDIENTE' | 'EN_PROCESO' | 'NOTIFICADO' | 'CONFIRMADO' | 'RECHAZADO'
  satNumeroManual: string | null
  satFechaEnvioManual: string | null
  plazoLegalHoras: number
  sede: { id: string; nombre: string; tipoInstalacion: string }
  worker: { id: string; firstName: string; lastName: string; dni: string } | null
  _count: { investigaciones: number }
}

const TIPO_LABEL: Record<TipoAccidente, string> = {
  MORTAL: 'Mortal',
  NO_MORTAL: 'No mortal',
  INCIDENTE_PELIGROSO: 'Incidente peligroso',
  ENFERMEDAD_OCUPACIONAL: 'Enfermedad ocupacional',
}

const TIPO_VARIANT: Record<TipoAccidente, 'critical' | 'danger' | 'warning' | 'info'> = {
  MORTAL: 'critical',
  INCIDENTE_PELIGROSO: 'danger',
  NO_MORTAL: 'warning',
  ENFERMEDAD_OCUPACIONAL: 'info',
}

const ESTADO_LABEL: Record<AccidenteItem['satEstado'], string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  NOTIFICADO: 'Notificado',
  CONFIRMADO: 'Confirmado',
  RECHAZADO: 'Rechazado',
}

const ESTADO_VARIANT: Record<AccidenteItem['satEstado'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  PENDIENTE: 'warning',
  EN_PROCESO: 'info',
  NOTIFICADO: 'info',
  CONFIRMADO: 'success',
  RECHAZADO: 'danger',
}

export default function AccidentesPage() {
  const [accidentes, setAccidentes] = useState<AccidenteItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'TODOS' | 'PENDIENTES' | 'NOTIFICADOS' | 'VENCIDOS'>('TODOS')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/sst/accidentes', { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudieron cargar los accidentes')
        }
        const json = await res.json()
        if (!cancelled) {
          setAccidentes(json.accidentes ?? [])
          setStats(json.stats ?? {})
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const now = new Date()
  const decorated = accidentes.map((a) => {
    const plazo = calcularPlazoSat(a.tipo, new Date(a.fechaHora))
    const cd = evaluarCountdown(plazo.deadline, now)
    const notificado = a.satEstado === 'NOTIFICADO' || a.satEstado === 'CONFIRMADO'
    return { ...a, deadline: plazo.deadline, countdown: cd, notificado }
  })

  const visibles = decorated.filter((a) => {
    if (filtro === 'TODOS') return true
    if (filtro === 'PENDIENTES') return !a.notificado
    if (filtro === 'NOTIFICADOS') return a.notificado
    if (filtro === 'VENCIDOS') return !a.notificado && a.countdown.estado === 'VENCIDO'
    return true
  })

  const pendientes = decorated.filter((a) => !a.notificado).length
  const vencidos = decorated.filter((a) => !a.notificado && a.countdown.estado === 'VENCIDO').length
  const proximos = decorated.filter(
    (a) => !a.notificado && (a.countdown.estado === 'CRITICO' || a.countdown.estado === 'PROXIMO'),
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Accidentes"
        title="Accidentes y notificación SAT"
        subtitle="Tracking manual de notificaciones al SAT (D.S. 006-2022-TR). COMPLY360 te asiste con el plazo y el PDF imprimible — la notificación oficial la haces tú en gob.pe/774."
        actions={
          <Link href="/dashboard/sst/accidentes/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar accidente
            </Button>
          </Link>
        }
      />

      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Total"
          value={accidentes.length}
          variant="neutral"
          active={filtro === 'TODOS'}
          onClick={() => setFiltro('TODOS')}
        />
        <Stat
          label="Pendientes SAT"
          value={pendientes}
          variant="warning"
          active={filtro === 'PENDIENTES'}
          onClick={() => setFiltro('PENDIENTES')}
        />
        <Stat
          label="Vencidos"
          value={vencidos}
          variant="critical"
          active={filtro === 'VENCIDOS'}
          onClick={() => setFiltro('VENCIDOS')}
        />
        <Stat
          label="Notificados"
          value={stats.NOTIFICADO ?? 0 + (stats.CONFIRMADO ?? 0)}
          variant="success"
          active={filtro === 'NOTIFICADOS'}
          onClick={() => setFiltro('NOTIFICADOS')}
        />
      </div>

      {proximos > 0 && filtro !== 'PENDIENTES' && filtro !== 'VENCIDOS' && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Tienes {proximos} accidente{proximos === 1 ? '' : 's'} con plazo SAT próximo a vencer (≤24h).
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Activity className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">
                {accidentes.length === 0
                  ? 'No hay accidentes registrados'
                  : 'No hay accidentes con este filtro'}
              </p>
              {accidentes.length === 0 && (
                <p className="text-sm text-slate-500">
                  Cuando ocurra un accidente, regístralo aquí para activar el contador del plazo SAT.
                </p>
              )}
            </div>
            {accidentes.length === 0 && (
              <Link href="/dashboard/sst/accidentes/nuevo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primero
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left">Fecha</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Sede / Trabajador</th>
                  <th className="px-3 py-3 text-left">Plazo SAT</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium">
                        {new Date(a.fechaHora).toLocaleDateString('es-PE')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(a.fechaHora).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={TIPO_VARIANT[a.tipo]} size="xs">
                        {TIPO_LABEL[a.tipo]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="font-medium">{a.sede.nombre}</div>
                      {a.worker && (
                        <div className="text-xs text-slate-500">
                          {a.worker.firstName} {a.worker.lastName} · DNI {a.worker.dni}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {a.notificado ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Cumplido
                        </span>
                      ) : (
                        <CountdownChip estado={a.countdown.estado} texto={a.countdown.texto} />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={ESTADO_VARIANT[a.satEstado]} size="xs">
                        {ESTADO_LABEL[a.satEstado]}
                      </Badge>
                      {a.satNumeroManual && (
                        <div className="mt-1 text-[10px] text-slate-500">N° {a.satNumeroManual}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/dashboard/sst/accidentes/${a.id}`}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        Detalle →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  variant,
  active,
  onClick,
}: {
  label: string
  value: number
  variant: 'neutral' | 'success' | 'warning' | 'critical'
  active: boolean
  onClick: () => void
}) {
  const ringClass: Record<typeof variant, string> = {
    neutral: 'ring-slate-300',
    success: 'ring-emerald-400',
    warning: 'ring-amber-400',
    critical: 'ring-crimson-500',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 ${
        active ? `ring-2 ${ringClass[variant]}` : ''
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </button>
  )
}

function CountdownChip({ estado, texto }: { estado: 'OK' | 'PROXIMO' | 'CRITICO' | 'VENCIDO'; texto: string }) {
  const cls =
    estado === 'VENCIDO'
      ? 'bg-rose-50 text-rose-700 border border-rose-200'
      : estado === 'CRITICO'
        ? 'bg-amber-50 text-amber-800 border border-amber-200'
        : estado === 'PROXIMO'
          ? 'bg-amber-50/60 text-amber-700 border border-amber-100'
          : 'bg-slate-50 text-slate-700 border border-slate-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <Clock className="h-3 w-3" />
      {texto}
    </span>
  )
}
