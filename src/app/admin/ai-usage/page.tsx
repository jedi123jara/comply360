'use client'

/**
 * /admin/ai-usage — Founder Console: telemetría de IA.
 *
 * Vista cross-org del consumo de IA. Lee de `/api/admin/ai-usage` que agrega
 * desde el modelo `AiUsage`. Solo SUPER_ADMIN.
 *
 * Diseño:
 *   - KPI strip: gasto total USD, calls, tokens, latencia p-avg
 *   - Sparkline 30d
 *   - Top 20 orgs por costo (con su plan para ver si FREE quema tokens)
 *   - Breakdown por feature (chat, contract-review, document-verify...)
 *   - Breakdown por provider (openai, groq, deepseek, ollama)
 */

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, DollarSign, Activity, Clock, RefreshCw } from 'lucide-react'

interface AiUsageResponse {
  windowDays: number
  since: string
  totals: {
    calls: number
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsd: number
    avgLatencyMs: number
  }
  byFeature: Array<{ feature: string; calls: number; costUsd: number; tokens: number }>
  byOrg: Array<{
    orgId: string | null
    orgName: string
    plan: string | null
    calls: number
    costUsd: number
    tokens: number
  }>
  byProvider: Array<{ provider: string; calls: number; costUsd: number; tokens: number }>
  byDay: Array<{ day: string; calls: number; costUsd: number }>
}

const RANGES = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 180, label: '180d' },
] as const

function fmtUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtN(n: number): string {
  return n.toLocaleString('es-PE')
}
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return null
  const styles: Record<string, string> = {
    FREE: 'bg-slate-100 text-slate-600 border-slate-300',
    STARTER: 'bg-blue-50 text-blue-700 border-blue-300',
    EMPRESA: 'bg-emerald-50 text-emerald-700 border-emerald-400',
    PRO: 'bg-amber-50 text-amber-800 border-amber-400',
    ENTERPRISE: 'bg-purple-50 text-purple-800 border-purple-400',
  }
  const cls = styles[plan.toUpperCase()] ?? styles.FREE
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>
      {plan}
    </span>
  )
}

function Sparkbar({ data }: { data: Array<{ day: string; costUsd: number; calls: number }> }) {
  if (data.length === 0) {
    return <div className="text-xs text-slate-400 italic">sin datos en el rango</div>
  }
  const max = Math.max(...data.map((d) => d.costUsd), 0.01)
  return (
    <div className="flex items-end gap-[2px] h-16 w-full">
      {data.map((d) => (
        <div
          key={d.day}
          className="flex-1 bg-emerald-500/80 hover:bg-emerald-600 transition-colors rounded-sm"
          style={{ height: `${Math.max(2, (d.costUsd / max) * 100)}%` }}
          title={`${d.day}: ${fmtUsd(d.costUsd)} (${d.calls} calls)`}
        />
      ))}
    </div>
  )
}

export default function AiUsagePage() {
  const [data, setData] = useState<AiUsageResponse | null>(null)
  const [days, setDays] = useState<number>(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useMemo(
    () => async (range: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/ai-usage?days=${range}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as AiUsageResponse
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(days)
  }, [load, days])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">
            Founder Console · IA
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Consumo de IA — últimos {days} días
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  days === r.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(days)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-3 w-3" />
            Refrescar
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Error al cargar: {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Cargando telemetría...
        </div>
      ) : null}

      {data ? (
        <>
          {/* ─── KPI strip ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              icon={DollarSign}
              label="Gasto total"
              value={fmtUsd(data.totals.costUsd)}
              hint={`${fmtN(data.totals.calls)} calls`}
            />
            <KpiCard
              icon={Sparkles}
              label="Tokens consumidos"
              value={fmtTokens(data.totals.totalTokens)}
              hint={`${fmtTokens(data.totals.promptTokens)} prompt + ${fmtTokens(data.totals.completionTokens)} compl.`}
            />
            <KpiCard
              icon={Clock}
              label="Latencia promedio"
              value={`${data.totals.avgLatencyMs}ms`}
              hint="por call"
            />
            <KpiCard
              icon={Activity}
              label="Calls / día (avg)"
              value={fmtN(Math.round(data.totals.calls / data.windowDays))}
              hint={`ventana ${data.windowDays}d`}
            />
          </div>

          {/* ─── Sparkline ─── */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Costo USD por día</h2>
              <span className="text-xs text-slate-500">{data.byDay.length} puntos</span>
            </div>
            <Sparkbar data={data.byDay} />
          </div>

          {/* ─── Breakdown grid ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable
              title="Top orgs por costo"
              items={data.byOrg.map((o) => ({
                name: o.orgName,
                badge: <PlanBadge plan={o.plan} />,
                calls: o.calls,
                costUsd: o.costUsd,
                tokens: o.tokens,
              }))}
              emptyMessage="Sin orgs con consumo en el rango"
            />
            <BreakdownTable
              title="Por feature"
              items={data.byFeature.map((f) => ({
                name: f.feature,
                calls: f.calls,
                costUsd: f.costUsd,
                tokens: f.tokens,
              }))}
              emptyMessage="Sin features con consumo"
            />
          </div>

          <BreakdownTable
            title="Por provider"
            items={data.byProvider.map((p) => ({
              name: p.provider,
              calls: p.calls,
              costUsd: p.costUsd,
              tokens: p.tokens,
            }))}
            emptyMessage="Sin providers activos"
          />
        </>
      ) : null}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  )
}

function BreakdownTable({
  title,
  items,
  emptyMessage,
}: {
  title: string
  items: Array<{
    name: string
    badge?: React.ReactNode
    calls: number
    costUsd: number
    tokens: number
  }>
  emptyMessage: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 italic">{emptyMessage}</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2 font-semibold">Nombre</th>
              <th className="px-3 py-2 font-semibold text-right">Calls</th>
              <th className="px-3 py-2 font-semibold text-right">Tokens</th>
              <th className="px-4 py-2 font-semibold text-right">Costo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-2 text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{it.name}</span>
                    {it.badge}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtN(it.calls)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtTokens(it.tokens)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900">
                  {fmtUsd(it.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
