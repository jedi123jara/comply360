'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  MapPin,
  Calendar,
  HardHat,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Estado = 'PROGRAMADA' | 'EN_CAMPO' | 'PENDIENTE_INGESTA' | 'EN_INGESTA' | 'CERRADA' | 'CANCELADA'

interface VisitaItem {
  id: string
  fechaProgramada: string
  fechaInicioCampo: string | null
  fechaCierreOficina: string | null
  estado: Estado
  sede: { id: string; nombre: string; tipoInstalacion: string }
  colaborador: { id: string; nombre: string; apellido: string; dni: string; especialidades: string[] }
  _count: { hallazgos: number }
}

const ESTADO_LABEL: Record<Estado, string> = {
  PROGRAMADA: 'Programada',
  EN_CAMPO: 'En campo',
  PENDIENTE_INGESTA: 'Pendiente ingesta',
  EN_INGESTA: 'En ingesta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}

const ESTADO_VARIANT: Record<Estado, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  PROGRAMADA: 'neutral',
  EN_CAMPO: 'info',
  PENDIENTE_INGESTA: 'warning',
  EN_INGESTA: 'info',
  CERRADA: 'success',
  CANCELADA: 'danger',
}

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<VisitaItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Estado | 'TODOS'>('TODOS')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/sst/visitas', { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudieron cargar las visitas')
        }
        const json = await res.json()
        if (!cancelled) {
          setVisitas(json.visitas ?? [])
          setStats(json.statsByEstado ?? {})
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

  const visibles = filtro === 'TODOS' ? visitas : visitas.filter((v) => v.estado === filtro)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Field Audit"
        title="Visitas de inspección"
        subtitle="Inspectores SST internos COMPLY360 hacen visitas presenciales con captura offline en tablet/móvil. Al regresar a oficina se hace la ingesta de datos."
        actions={
          <Link href="/dashboard/sst/visitas/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Programar visita
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <StatChip label="Total" value={visitas.length} variant="neutral" active={filtro === 'TODOS'} onClick={() => setFiltro('TODOS')} />
        <StatChip label="Programadas" value={stats.PROGRAMADA ?? 0} variant="neutral" active={filtro === 'PROGRAMADA'} onClick={() => setFiltro('PROGRAMADA')} />
        <StatChip label="En campo" value={stats.EN_CAMPO ?? 0} variant="info" active={filtro === 'EN_CAMPO'} onClick={() => setFiltro('EN_CAMPO')} />
        <StatChip label="Pdte. ingesta" value={stats.PENDIENTE_INGESTA ?? 0} variant="warning" active={filtro === 'PENDIENTE_INGESTA'} onClick={() => setFiltro('PENDIENTE_INGESTA')} />
        <StatChip label="Cerradas" value={stats.CERRADA ?? 0} variant="success" active={filtro === 'CERRADA'} onClick={() => setFiltro('CERRADA')} />
        <StatChip label="Canceladas" value={stats.CANCELADA ?? 0} variant="danger" active={filtro === 'CANCELADA'} onClick={() => setFiltro('CANCELADA')} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ClipboardCheck className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">
                {visitas.length === 0
                  ? 'No tienes visitas Field Audit programadas'
                  : 'No hay visitas con este filtro'}
              </p>
              {visitas.length === 0 && (
                <p className="text-sm text-slate-500">
                  Programa una visita asignando una sede y un colaborador SST interno.
                </p>
              )}
            </div>
            {visitas.length === 0 && (
              <Link href="/dashboard/sst/visitas/nueva">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Programar primera visita
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
                  <th className="px-3 py-3 text-left">Fecha programada</th>
                  <th className="px-3 py-3 text-left">Sede</th>
                  <th className="px-3 py-3 text-left">Inspector</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-left">Hallazgos</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {new Date(v.fechaProgramada).toLocaleDateString('es-PE')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(v.fechaProgramada).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3 text-emerald-600" />
                        {v.sede.nombre}
                      </div>
                      <div className="text-xs text-slate-500">{v.sede.tipoInstalacion}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <HardHat className="h-3 w-3 text-amber-600" />
                        {v.colaborador.nombre} {v.colaborador.apellido}
                      </div>
                      <div className="text-xs text-slate-500">
                        DNI {v.colaborador.dni}
                        {v.colaborador.especialidades.length > 0 &&
                          ` · ${v.colaborador.especialidades.slice(0, 2).join(', ')}`}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={ESTADO_VARIANT[v.estado]} size="xs">
                        {ESTADO_LABEL[v.estado]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{v._count.hallazgos}</td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/dashboard/sst/visitas/${v.id}`}
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

function StatChip({
  label,
  value,
  variant,
  active,
  onClick,
}: {
  label: string
  value: number
  variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  active: boolean
  onClick: () => void
}) {
  const ringClass: Record<typeof variant, string> = {
    neutral: 'ring-slate-300',
    info: 'ring-cyan-400',
    warning: 'ring-amber-400',
    success: 'ring-emerald-400',
    danger: 'ring-rose-400',
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
