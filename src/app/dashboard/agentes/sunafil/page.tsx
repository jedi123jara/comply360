'use client'

import { useState, useRef } from 'react'
import { ShieldAlert, Upload, Loader2, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import type { SunafilAnalysisOutput } from '@/lib/agents/sunafil-analyzer'
import type { AgentResult, AgentAction } from '@/lib/agents/types'

type TipoEmpresa = 'MICRO' | 'PEQUENA' | 'NO_MYPE'

const RISK_COLORS: Record<string, string> = {
  BAJO: 'bg-green-500/15 text-green-400 border-green-500/30',
  MEDIO: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  ALTO: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  CRITICO: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export default function SunafilAgentPage() {
  const [file, setFile] = useState<File | null>(null)
  const [tipoEmpresa, setTipoEmpresa] = useState<TipoEmpresa>('NO_MYPE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AgentResult<SunafilAnalysisOutput> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleRun() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('params', JSON.stringify({ tipoEmpresa }))
      const res = await fetch('/api/agents/sunafil-analyzer/run', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error ejecutando el agente')
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
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <ShieldAlert className="h-7 w-7 text-gold-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Analizador de Actas SUNAFIL</h1>
            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-semibold text-gold-400">
              BETA
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Sube un acta de inspección SUNAFIL en PDF o DOCX. La IA extrae los cargos, los mapea a
            artículos legales, calcula la multa proyectada con UIT 2026 (S/5,500) y propone una
            estrategia de defensa.
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="mb-2 block text-sm font-medium text-slate-300">Tipo de empresa</label>
        <select
          value={tipoEmpresa}
          onChange={e => setTipoEmpresa(e.target.value as TipoEmpresa)}
          className="mb-4 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
        >
          <option value="MICRO">Microempresa (hasta 10 trab.)</option>
          <option value="PEQUENA">Pequeña empresa (11-100 trab.)</option>
          <option value="NO_MYPE">No MYPE (mediana/grande)</option>
        </select>

        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-8 text-center transition hover:border-gold-500/60 hover:bg-slate-950"
        >
          <Upload className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-3 text-sm text-slate-300">
            {file ? file.name : 'Haz clic para seleccionar el acta SUNAFIL (PDF o DOCX)'}
          </p>
          {file && (
            <p className="mt-1 text-xs text-slate-500">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          onClick={handleRun}
          disabled={!file || loading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando...
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4" /> Ejecutar análisis
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Resumen del análisis</h2>
                <p className="mt-2 text-sm text-slate-300">{result.summary}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                  RISK_COLORS[data.nivelRiesgo] || RISK_COLORS.BAJO
                }`}
              >
                Riesgo {data.nivelRiesgo}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Multa mín." value={`S/ ${data.multaTotalProyectada.min.toLocaleString('es-PE')}`} />
              <Metric label="Multa máx." value={`S/ ${data.multaTotalProyectada.max.toLocaleString('es-PE')}`} />
              <Metric
                label="Plazo descargo"
                value={data.fechaLimiteDescargo || `${data.plazoDescargoDias} días háb.`}
              />
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
                <p className="font-semibold">Advertencias:</p>
                <ul className="mt-1 list-disc pl-4">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Cargos */}
          {data.cargos.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <FileText className="h-5 w-5 text-gold-500" /> Cargos identificados ({data.cargos.length})
              </h2>
              <div className="space-y-3">
                {data.cargos.map(c => (
                  <div
                    key={c.numero}
                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gold-500">#{c.numero}</span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              c.gravedad === 'MUY_GRAVE'
                                ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                : c.gravedad === 'GRAVE'
                                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                            }`}
                          >
                            {c.gravedad}
                          </span>
                          {c.subsanable && (
                            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-400">
                              Subsanable
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-white">{c.descripcion}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {c.articuloInfringido} · {c.normaLegal}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Multa estimada</p>
                        <p className="text-sm font-semibold text-gold-400">
                          S/ {c.multaEstimadaSoles.min.toLocaleString('es-PE')} -{' '}
                          {c.multaEstimadaSoles.max.toLocaleString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">
                        Defensa sugerida
                      </p>
                      <p className="mt-1 text-xs text-slate-300">{c.defensaSugerida}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estrategia */}
          {data.estrategiaDefensa && (
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-6">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                <CheckCircle2 className="h-5 w-5 text-gold-500" /> Estrategia de defensa global
              </h2>
              <p className="text-sm text-slate-200">{data.estrategiaDefensa}</p>
            </div>
          )}

          {/* Acciones */}
          {result.recommendedActions.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Próximos pasos</h2>
              <div className="space-y-2">
                {result.recommendedActions.map((a: AgentAction) => (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 ${
                      a.priority === 'critical'
                        ? 'border-red-500/30 bg-red-500/5'
                        : a.priority === 'important'
                          ? 'border-orange-500/30 bg-orange-500/5'
                          : 'border-slate-700 bg-slate-950/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{a.label}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  )
}
