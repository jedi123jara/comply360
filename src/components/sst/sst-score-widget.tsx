'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck, ArrowRight, AlertTriangle, Banknote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO'

interface ScoreSnapshot {
  scoreGlobal: number
  semaforo: Semaforo
  exposicionEconomica: { totalSoles: number }
  recomendaciones: Array<{ prioridad: string }>
}

const SEMAFORO_STYLES: Record<Semaforo, { ring: string; text: string; bg: string; label: string }> = {
  VERDE: {
    ring: 'ring-emerald-300',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    label: 'CUMPLE',
  },
  AMARILLO: {
    ring: 'ring-amber-300',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    label: 'EN RIESGO',
  },
  ROJO: { ring: 'ring-rose-400', text: 'text-rose-700', bg: 'bg-rose-50', label: 'CRÍTICO' },
}

/**
 * Widget compacto del Score SST Premium para mostrar en el cockpit principal.
 * Carga el score lazy (no bloquea el render del dashboard) y enlaza al
 * detalle completo.
 */
export function SstScoreWidget({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ScoreSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/sst/score', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('No disponible')
        return r.json() as Promise<ScoreSnapshot>
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando score SST...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-5 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>Score SST no disponible</span>
          </div>
          <Link
            href="/dashboard/sst/score"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Configurar SST <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>
    )
  }

  const sem = SEMAFORO_STYLES[data.semaforo]
  const recsCriticas = data.recomendaciones.filter(
    (r) => r.prioridad === 'CRITICAL' || r.prioridad === 'HIGH',
  ).length

  if (compact) {
    return (
      <Link
        href="/dashboard/sst/score"
        className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${sem.bg} ring-2 ${sem.ring}`}>
            <span className={`text-base font-black ${sem.text}`}>{data.scoreGlobal}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Score SST</div>
            <Badge variant={data.semaforo === 'VERDE' ? 'success' : data.semaforo === 'AMARILLO' ? 'warning' : 'danger'} size="xs">
              {sem.label}
            </Badge>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              SCORE SST PREMIUM
            </div>
            <div className="mt-2 flex items-end gap-3">
              <span className={`text-5xl font-black ${sem.text}`}>{data.scoreGlobal}</span>
              <span className="pb-2 text-xs text-slate-500">/100</span>
            </div>
            <Badge
              variant={
                data.semaforo === 'VERDE'
                  ? 'success'
                  : data.semaforo === 'AMARILLO'
                    ? 'warning'
                    : 'danger'
              }
              size="xs"
            >
              {sem.label}
            </Badge>
          </div>

          <Link
            href="/dashboard/sst/score"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Ver detalle <ArrowRight className="inline h-3 w-3" />
          </Link>
        </div>

        {(data.exposicionEconomica.totalSoles > 0 || recsCriticas > 0) && (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            {data.exposicionEconomica.totalSoles > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Banknote className="h-3.5 w-3.5 text-rose-600" />
                <span className="text-slate-500">Exposición:</span>
                <span className="font-bold text-rose-700">
                  S/ {data.exposicionEconomica.totalSoles.toLocaleString('es-PE')}
                </span>
              </div>
            )}
            {recsCriticas > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-slate-700">
                  {recsCriticas}{' '}
                  {recsCriticas === 1
                    ? 'recomendación crítica/alta'
                    : 'recomendaciones críticas/altas'}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
