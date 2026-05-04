'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO'
type Prioridad = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type Area = 'IPERC' | 'EMO' | 'SAT' | 'COMITE' | 'FIELD_AUDIT' | 'SEDES'

interface BreakdownItem {
  score: number
  max: number
  nota: string
}

interface Recomendacion {
  prioridad: Prioridad
  area: Area
  titulo: string
  detalle: string
  impactoSoles: number
}

interface ScoreData {
  scoreGlobal: number
  semaforo: Semaforo
  breakdown: {
    iperc: BreakdownItem
    emo: BreakdownItem
    sat: BreakdownItem
    comite: BreakdownItem
    fieldAudit: BreakdownItem
    sedes: BreakdownItem
  }
  exposicionEconomica: {
    totalSoles: number
    detalle: Array<{
      area: string
      tipicidad: string
      multaSoles: number
      motivo: string
    }>
  }
  recomendaciones: Recomendacion[]
  contexto: {
    numeroTrabajadores: number
    esMype: boolean
    plan: string | null
  }
  snapshotResumen: {
    sedes: number
    sedesActivas: number
    ipercVigentes: number
    emosVigentes: number
    accidentesUlt12m: number
    visitasUlt6m: number
  }
}

const SEMAFORO_COLOR: Record<Semaforo, { fg: string; bg: string; ring: string; label: string }> = {
  VERDE: { fg: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-300', label: 'CUMPLE' },
  AMARILLO: { fg: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-300', label: 'EN RIESGO' },
  ROJO: { fg: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-400', label: 'CRÍTICO' },
}

const PRIORIDAD_VARIANT: Record<Prioridad, 'critical' | 'danger' | 'warning' | 'info'> = {
  CRITICAL: 'critical',
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
}

const AREA_LINK: Record<Area, string> = {
  IPERC: '/dashboard/sst/sedes',
  EMO: '/dashboard/sst/emo',
  SAT: '/dashboard/sst/accidentes',
  COMITE: '/dashboard/sst/comite',
  FIELD_AUDIT: '/dashboard/sst/visitas',
  SEDES: '/dashboard/sst/sedes',
}

const AREA_LABEL: Record<Area, string> = {
  IPERC: 'IPERC',
  EMO: 'EMO',
  SAT: 'Notificación SAT',
  COMITE: 'Comité SST',
  FIELD_AUDIT: 'Field Audit',
  SEDES: 'Sedes',
}

export default function SstScorePage() {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/sst/score', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error || 'No se pudo calcular el score')
        }
        return r.json()
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Calculando score SST...
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-rose-200 bg-rose-50/60">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? 'Error desconocido'}
        </CardContent>
      </Card>
    )
  }

  const sem = SEMAFORO_COLOR[data.semaforo]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SST · Scoring"
        title="Score SST"
        subtitle="Diagnóstico ponderado de cumplimiento Ley 29783 + estimación de exposición económica según D.S. 019-2006-TR (UIT 2026 = S/ 5,500)."
      />

      {/* Hero score */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className={`${sem.bg} border-2 ${sem.ring.replace('ring-', 'border-')}`}>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className={`text-7xl font-black ${sem.fg}`}>{data.scoreGlobal}</div>
              <div className="mt-2 text-sm text-slate-500">de 100</div>
              <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${sem.fg} ${sem.bg} ring-1 ${sem.ring}`}>
                {sem.label}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <Card>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Snapshot label="Trabajadores activos" value={data.contexto.numeroTrabajadores} />
              <Snapshot
                label="Régimen"
                value={data.contexto.esMype ? 'MYPE' : 'General'}
                hint={data.contexto.plan ?? ''}
              />
              <Snapshot label="Sedes activas" value={data.snapshotResumen.sedesActivas} />
              <Snapshot
                label="IPERC vigentes"
                value={data.snapshotResumen.ipercVigentes}
                hint={`${data.snapshotResumen.sedesActivas} sedes`}
              />
              <Snapshot
                label="EMO vigentes"
                value={data.snapshotResumen.emosVigentes}
                hint={`${data.contexto.numeroTrabajadores} trab.`}
              />
              <Snapshot label="Accidentes 12m" value={data.snapshotResumen.accidentesUlt12m} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exposición económica */}
      {data.exposicionEconomica.totalSoles > 0 && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <Banknote className="mt-0.5 h-6 w-6 text-rose-600" />
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900">
                  Exposición económica estimada
                </h2>
                <p className="mt-1 text-3xl font-black text-rose-700">
                  S/ {data.exposicionEconomica.totalSoles.toLocaleString('es-PE')}
                </p>
                <p className="text-xs text-slate-600">
                  Multa potencial si SUNAFIL inspecciona hoy con las brechas detectadas (D.S.
                  019-2006-TR · UIT 2026 S/ 5,500
                  {data.contexto.esMype ? ' · régimen MYPE -50%' : ''}).
                </p>
                <ul className="mt-3 space-y-1 text-xs text-slate-700">
                  {data.exposicionEconomica.detalle.map((d, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="danger" size="xs">
                        {d.tipicidad}
                      </Badge>
                      <span className="flex-1">{d.motivo}</span>
                      <span className="font-semibold text-slate-900">
                        S/ {d.multaSoles.toLocaleString('es-PE')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breakdown por dimensión */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Breakdown por dimensión
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            <DimRow label="IPERC vigente" item={data.breakdown.iperc} link="/dashboard/sst/sedes" />
            <DimRow label="Cobertura EMO" item={data.breakdown.emo} link="/dashboard/sst/emo" />
            <DimRow label="Cumplimiento SAT" item={data.breakdown.sat} link="/dashboard/sst/accidentes" />
            <DimRow label="Comité SST" item={data.breakdown.comite} link="/dashboard/sst/comite" />
            <DimRow label="Field Audit" item={data.breakdown.fieldAudit} link="/dashboard/sst/visitas" />
            <DimRow label="Datos sedes" item={data.breakdown.sedes} link="/dashboard/sst/sedes" />
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      {data.recomendaciones.length > 0 ? (
        <Card>
          <CardContent className="py-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Recomendaciones priorizadas ({data.recomendaciones.length})
            </h2>
            <div className="space-y-3">
              {data.recomendaciones.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={PRIORIDAD_VARIANT[r.prioridad]} size="xs">
                          {r.prioridad}
                        </Badge>
                        <span className="text-xs font-medium text-slate-500">{AREA_LABEL[r.area]}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-slate-900">{r.titulo}</h3>
                      <p className="mt-1 text-xs text-slate-600">{r.detalle}</p>
                      {r.impactoSoles > 0 && (
                        <p className="mt-1 text-xs font-medium text-rose-700">
                          Impacto evitable: S/ {r.impactoSoles.toLocaleString('es-PE')}
                        </p>
                      )}
                    </div>
                    <Link
                      href={AREA_LINK[r.area]}
                      className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Ir <ArrowRight className="inline h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center gap-3 py-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Sin recomendaciones críticas</p>
              <p className="text-xs text-emerald-800">
                Tu compliance SST está al día. Mantén las visitas Field Audit y revisa el IPERC
                anualmente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Snapshot({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </div>
  )
}

function DimRow({ label, item, link }: { label: string; item: BreakdownItem; link: string }) {
  const ratio = item.score / item.max
  const tone = ratio >= 0.8 ? 'emerald' : ratio >= 0.5 ? 'amber' : 'rose'
  const barColor =
    tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
  const textColor =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-rose-700'
  return (
    <Link href={link} className="block rounded-lg border border-slate-100 px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50/50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900">{label}</span>
            <span className={`text-xs font-bold ${textColor}`}>
              {item.score}/{item.max}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{item.nota}</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className={`h-1.5 rounded-full ${barColor} transition-all`}
              style={{ width: `${(item.score / item.max) * 100}%` }}
            />
          </div>
        </div>
        {ratio < 0.8 && <AlertTriangle className={`h-4 w-4 shrink-0 ${textColor}`} />}
      </div>
    </Link>
  )
}
