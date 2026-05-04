'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Loader2,
  AlertCircle,
  Stethoscope,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Aptitud = 'APTO' | 'APTO_CON_RESTRICCIONES' | 'NO_APTO' | 'OBSERVADO'

interface EmoItem {
  id: string
  workerId: string
  tipoExamen: string
  fechaExamen: string
  centroMedicoNombre: string
  aptitud: Aptitud
  proximoExamenAntes: string | null
  worker: { id: string; firstName: string; lastName: string; dni: string }
}

const TIPO_LABEL: Record<string, string> = {
  PRE_EMPLEO: 'Pre-empleo',
  PERIODICO: 'Periódico',
  RETIRO: 'Retiro',
  REINTEGRO_LARGA_AUSENCIA: 'Reintegro',
}

const APTITUD_LABEL: Record<Aptitud, string> = {
  APTO: 'Apto',
  APTO_CON_RESTRICCIONES: 'Apto con restricciones',
  NO_APTO: 'No apto',
  OBSERVADO: 'Observado',
}

const APTITUD_VARIANT: Record<Aptitud, 'success' | 'warning' | 'danger' | 'info'> = {
  APTO: 'success',
  APTO_CON_RESTRICCIONES: 'warning',
  NO_APTO: 'danger',
  OBSERVADO: 'info',
}

export default function EmoPage() {
  const [emos, setEmos] = useState<EmoItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Aptitud | 'TODOS'>('TODOS')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/sst/emo', { cache: 'no-store' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudieron cargar los exámenes')
        }
        const json = await res.json()
        if (!cancelled) {
          setEmos(json.emos ?? [])
          setStats(json.statsByAptitud ?? {})
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
  const visibles = filtro === 'TODOS' ? emos : emos.filter((e) => e.aptitud === filtro)

  const proximos = emos.filter((e) => {
    if (!e.proximoExamenAntes) return false
    const d = new Date(e.proximoExamenAntes)
    const days = (d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    return days >= 0 && days <= 60
  }).length

  const vencidos = emos.filter((e) => {
    if (!e.proximoExamenAntes) return false
    return new Date(e.proximoExamenAntes) < now
  }).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Salud ocupacional"
        title="Exámenes médicos ocupacionales"
        subtitle="EMO conforme a R.M. 312-2011-MINSA y R.M. 571-2014-MINSA. Solo se persiste la aptitud (APTO/RESTRINGIDO/NO APTO/OBSERVADO). El diagnóstico jamás toca COMPLY360 (Ley 29733)."
        actions={
          <Link href="/dashboard/sst/emo/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar EMO
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

      {/* Banner privacidad */}
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex items-start gap-3 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div className="text-xs text-emerald-900">
            <strong>Privacidad médica reforzada.</strong> COMPLY360 solo guarda la aptitud y, si
            corresponde, las restricciones laborales (cifradas con pgcrypto). Nunca se persisten
            diagnósticos, historias clínicas ni tratamientos — esos datos quedan únicamente en
            el centro médico DIGESA. Cada lectura de las restricciones queda en el audit log.
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatChip
          label="Total"
          value={emos.length}
          variant="neutral"
          active={filtro === 'TODOS'}
          onClick={() => setFiltro('TODOS')}
        />
        <StatChip
          label="Apto"
          value={stats.APTO ?? 0}
          variant="success"
          active={filtro === 'APTO'}
          onClick={() => setFiltro('APTO')}
        />
        <StatChip
          label="Con restricciones"
          value={stats.APTO_CON_RESTRICCIONES ?? 0}
          variant="warning"
          active={filtro === 'APTO_CON_RESTRICCIONES'}
          onClick={() => setFiltro('APTO_CON_RESTRICCIONES')}
        />
        <StatChip
          label="No apto"
          value={stats.NO_APTO ?? 0}
          variant="danger"
          active={filtro === 'NO_APTO'}
          onClick={() => setFiltro('NO_APTO')}
        />
        <StatChip
          label="Observado"
          value={stats.OBSERVADO ?? 0}
          variant="info"
          active={filtro === 'OBSERVADO'}
          onClick={() => setFiltro('OBSERVADO')}
        />
      </div>

      {/* Alertas próximos / vencidos */}
      {(proximos > 0 || vencidos > 0) && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            {vencidos > 0 && (
              <span>
                <strong>{vencidos}</strong> EMO con próximo examen ya vencido.
              </span>
            )}
            {proximos > 0 && (
              <span>
                <strong>{proximos}</strong> EMO con próximo examen en los siguientes 60 días.
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando exámenes...
        </div>
      ) : visibles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Stethoscope className="h-10 w-10 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">
                {emos.length === 0
                  ? 'Aún no tienes EMO registrados'
                  : 'No hay EMO con este filtro'}
              </p>
              <p className="text-sm text-slate-500">
                Registra el certificado de aptitud que te entrega el centro médico.
              </p>
            </div>
            {emos.length === 0 && (
              <Link href="/dashboard/sst/emo/nuevo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar primer EMO
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
                  <th className="px-3 py-3 text-left">Trabajador</th>
                  <th className="px-3 py-3 text-left">Tipo</th>
                  <th className="px-3 py-3 text-left">Fecha examen</th>
                  <th className="px-3 py-3 text-left">Centro médico</th>
                  <th className="px-3 py-3 text-left">Aptitud</th>
                  <th className="px-3 py-3 text-left">Próximo examen</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((e) => {
                  const proximo = e.proximoExamenAntes ? new Date(e.proximoExamenAntes) : null
                  const proxVencido = proximo && proximo < now
                  const proxProximo =
                    proximo &&
                    !proxVencido &&
                    (proximo.getTime() - now.getTime()) / (24 * 60 * 60 * 1000) <= 60
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 text-slate-700">
                        <div className="font-medium">
                          {e.worker.firstName} {e.worker.lastName}
                        </div>
                        <div className="text-xs text-slate-500">DNI {e.worker.dni}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <Badge variant="info" size="xs">
                          {TIPO_LABEL[e.tipoExamen] ?? e.tipoExamen}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {new Date(e.fechaExamen).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-700">{e.centroMedicoNombre}</td>
                      <td className="px-3 py-3">
                        <Badge variant={APTITUD_VARIANT[e.aptitud]} size="xs">
                          {APTITUD_LABEL[e.aptitud]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {proximo ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              proxVencido
                                ? 'text-rose-700'
                                : proxProximo
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {proximo.toLocaleDateString('es-PE')}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/dashboard/sst/emo/${e.id}`}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                        >
                          Detalle →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
  variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  active: boolean
  onClick: () => void
}) {
  const ringClass: Record<typeof variant, string> = {
    neutral: 'ring-slate-300',
    success: 'ring-emerald-400',
    warning: 'ring-amber-400',
    danger: 'ring-rose-400',
    info: 'ring-cyan-400',
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
