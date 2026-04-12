'use client'

import { useState } from 'react'
import {
  Radar,
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react'
import type { RiskMonitorOutput, RiskFinding } from '@/lib/agents/risk-monitor'
import type { AgentResult } from '@/lib/agents/types'

const SEV_COLORS: Record<string, string> = {
  CRITICO: 'border-red-500/40 bg-red-500/10 text-red-300',
  ALTO: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  MEDIO: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  BAJO: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
}

export default function RadarPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AgentResult<RiskMonitorOutput> | null>(null)

  async function runScan() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/risk-monitor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'json' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error ejecutando barrido')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const data = result?.data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gold-500/10 p-3">
            <Radar className="h-7 w-7 text-gold-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">Radar SUNAFIL</h1>
              <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400">
                BETA
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Visión en tiempo real de tu exposición a multas SUNAFIL. El barrido revisa todos los
              trabajadores y contratos buscando incumplimientos antes de que se conviertan en
              inspección.
            </p>
          </div>
        </div>
        {result && (
          <button
            onClick={runScan}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a6e] hover:bg-[#162d57] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Escaneando...</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Re-escanear</>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4" /> {error}
        </div>
      )}

      {!result && !loading && (
        <div className="rounded-2xl border border-[#1e3a6e]/30 bg-[#1e3a6e]/[0.06] p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1e3a6e]/20 mb-5">
            <Radar className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Analiza tu exposicion a multas SUNAFIL</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            El barrido revisa contratos vencidos, documentos faltantes, vacaciones acumuladas,
            CTS pendiente y mas — todo en un solo clic.
          </p>
          <button
            onClick={runScan}
            disabled={loading}
            className="inline-flex items-center gap-2.5 rounded-xl bg-[#1e3a6e] hover:bg-[#162d57] px-8 py-3.5 text-base font-bold text-white transition-colors shadow-lg shadow-blue-900/30"
          >
            <RefreshCw className="h-5 w-5" />
            Ejecutar Barrido Completo
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Recomendado: ejecutar semanalmente para no perder ningun cambio.
          </p>
        </div>
      )}

      {loading && !result && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-12 text-center">
          <Loader2 className="mx-auto h-12 w-12 text-blue-400 animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Escaneando trabajadores y contratos...</p>
          <p className="text-xs text-slate-500 mt-1">Esto puede tomar unos segundos</p>
        </div>
      )}

      {data && (
        <>
          {/* Score gauge */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-1">
              <p className="text-xs uppercase text-slate-500">Score de riesgo</p>
              <div className="mt-2 flex items-end gap-2">
                <p
                  className={`text-5xl font-bold ${
                    data.scoreRiesgo >= 80
                      ? 'text-green-400'
                      : data.scoreRiesgo >= 50
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {data.scoreRiesgo}
                </p>
                <span className="mb-1 text-sm text-slate-500">/100</span>
                {data.scoreRiesgo >= 80 ? (
                  <TrendingUp className="mb-1 h-5 w-5 text-green-400" />
                ) : (
                  <TrendingDown className="mb-1 h-5 w-5 text-red-400" />
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {data.scoreRiesgo >= 80
                  ? '✅ Compliance saludable'
                  : data.scoreRiesgo >= 50
                    ? '⚠️ Riesgo moderado, atender pronto'
                    : '🚨 Exposición crítica, acción inmediata'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 lg:col-span-2">
              <p className="text-xs uppercase text-slate-500">Exposición potencial</p>
              <p className="mt-2 text-4xl font-bold text-gold-400">
                S/ {data.exposicionTotalSoles.toLocaleString('es-PE')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Suma de multas potenciales si SUNAFIL inspeccionara hoy
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Severity label="Críticos" value={data.desglosePorSeveridad.CRITICO} sev="CRITICO" />
                <Severity label="Altos" value={data.desglosePorSeveridad.ALTO} sev="ALTO" />
                <Severity label="Medios" value={data.desglosePorSeveridad.MEDIO} sev="MEDIO" />
                <Severity label="Bajos" value={data.desglosePorSeveridad.BAJO} sev="BAJO" />
              </div>
            </div>
          </div>

          {/* Hallazgos */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Hallazgos detectados ({data.findings.length})
              </h2>
              <p className="text-xs text-slate-500">
                {data.totalTrabajadoresEvaluados} trabajadores · {data.totalContratosEvaluados}{' '}
                contratos evaluados
              </p>
            </div>

            {data.findings.length === 0 ? (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center text-sm text-green-300">
                ✅ No se encontraron hallazgos. Tu organización está al día.
              </div>
            ) : (
              <div className="space-y-2">
                {data.findings.map(f => (
                  <FindingRow key={f.id} f={f} />
                ))}
              </div>
            )}
          </div>

          {result.recommendedActions.length > 0 && (
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
              <h2 className="mb-3 text-lg font-semibold text-white">Próximos pasos sugeridos</h2>
              <div className="space-y-2">
                {result.recommendedActions.map(a => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-slate-700 bg-slate-950/40 p-3"
                  >
                    <p className="text-sm font-semibold text-white">{a.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            Último escaneo: {new Date(data.scanFecha).toLocaleString('es-PE')} · Duración:{' '}
            {result.durationMs}ms
          </p>
        </>
      )}
    </div>
  )
}

function Severity({ label, value, sev }: { label: string; value: number; sev: string }) {
  return (
    <div
      className={`rounded-lg border p-2 text-center ${SEV_COLORS[sev] || ''}`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase">{label}</p>
    </div>
  )
}

function FindingRow({ f }: { f: RiskFinding }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                SEV_COLORS[f.severidad] || ''
              }`}
            >
              {f.severidad}
            </span>
            <span className="text-[10px] uppercase text-slate-500">{f.categoria}</span>
          </div>
          <p className="text-sm font-semibold text-white">{f.titulo}</p>
          <p className="mt-1 text-xs text-slate-400">{f.descripcion}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            <b>Base legal:</b> {f.baseLegal}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            <b>Fix:</b> {f.fixSugerido}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-500">Multa potencial</p>
          <p className="text-sm font-semibold text-gold-400">
            S/ {f.multaPotencialSoles.toLocaleString('es-PE')}
          </p>
          {f.fixUrl && (
            <a
              href={f.fixUrl}
              className="mt-2 inline-block text-[11px] text-gold-400 hover:underline"
            >
              Resolver →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
