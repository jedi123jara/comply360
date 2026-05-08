'use client'

import { useCallback, useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, LineChart as LineIcon } from 'lucide-react'
import { MoneyDisplay } from './money-display'
import { formatPeriodoCorto, formatSoles } from '@/lib/format/peruvian'

interface SeriePoint {
  periodo: string
  ingresos: number
  descuentos: number
  neto: number
  aceptado: boolean
}

interface SerieResponse {
  serie: SeriePoint[]
  promedio: { ingresos: number; descuentos: number; neto: number }
  months: number
}

/**
 * Gráfico de evolución del sueldo neto de los últimos 12 meses.
 * Usa recharts (ya instalado). Mobile-first: responsive container + tooltip touch.
 */
export function SalaryChart() {
  const [data, setData] = useState<SerieResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/mi-portal/boletas/serie?months=12', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const body = (await res.json()) as SerieResponse
      setData(body)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    )
  }

  if (!data || data.serie.length < 2) {
    // No vale la pena mostrar un chart con 0-1 puntos
    return null
  }

  const formatted = data.serie.map((p) => ({
    ...p,
    label: formatPeriodoCorto(p.periodo),
  }))

  const first = formatted[0]
  const last = formatted[formatted.length - 1]
  const delta = last.neto - first.neto
  const deltaPct = first.neto > 0 ? Math.round((delta / first.neto) * 100) : 0
  const trendUp = delta >= 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            <LineIcon className="w-3.5 h-3.5" />
            Mi sueldo neto · últimos {data.months} meses
          </div>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <MoneyDisplay value={last.neto} size="lg" tone="good" emphasis />
            <span
              className={`text-xs font-semibold flex items-center gap-0.5 ${
                trendUp ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${trendUp ? '' : 'rotate-180'}`} />
              {deltaPct >= 0 ? '+' : ''}{deltaPct}% vs {first.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Promedio del período: {formatSoles(data.promedio.neto)}
          </p>
        </div>
      </div>

      <div className="h-44 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `S/${(v / 1000).toFixed(0)}K`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v) => [formatSoles(typeof v === 'number' ? v : Number(v) || 0), 'Neto']}
            />
            <Line
              type="monotone"
              dataKey="neto"
              stroke="#1d4ed8"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#1d4ed8' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
