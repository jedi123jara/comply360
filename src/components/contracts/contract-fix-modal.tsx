'use client'

/**
 * ContractFixModal — modal full-screen que muestra el diff Original vs Corregido
 * generado por `/api/ai/contract-fix`.
 *
 * Único en mercado peruano: la mayoría de tools solo señalan problemas,
 * Comply360 además genera la versión reescrita lista para revisar con tu
 * abogado y firmar.
 *
 * Flujo:
 *   1. Usuario hace clic "Generar versión corregida" en InlineAIReview
 *   2. Modal se abre con loading state
 *   3. Llama POST /api/ai/contract-fix con contractHtml + reviewResult
 *   4. Muestra diff side-by-side O word-level inline (toggle) + lista de cambios
 *   5. Usuario puede:
 *      - Guardar como Contract DRAFT (POST /save) → redirect al contrato
 *      - Descargar PDF profesional (POST /pdf)
 *      - Copiar HTML al clipboard
 *      - Cerrar
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  Download,
  Copy,
  CheckCircle2,
  FileText,
  ArrowRight,
  ShieldCheck,
  Save,
  Columns2,
  Combine,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { diffWords, stripHtmlForDiff, diffStats } from '@/lib/diff/word-diff'

interface AIReviewResult {
  overallScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risks: Array<{
    id: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    category: string
    title: string
    description: string
    clause: string
    recommendation: string
    legalBasis?: string
    multaUIT?: number
  }>
  suggestions: Array<{
    type: 'ADD' | 'MODIFY' | 'REMOVE'
    clause: string
    suggestion: string
    reason: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
  clausulasObligatorias: Array<{
    nombre: string
    descripcion: string
    presente: boolean
    baseLegal: string
    obligatoriedad: 'OBLIGATORIA' | 'RECOMENDADA'
  }>
  resumenEjecutivo: string
  multaEstimadaUIT?: number
  summary?: string
}

interface ContractFixChange {
  type: 'ADD' | 'MODIFY' | 'REMOVE'
  category: string
  before?: string
  after?: string
  reason: string
  legalBasis?: string
}

interface ContractFixResult {
  fixedHtml: string
  changes: ContractFixChange[]
  remainingRisks: number
  summary: string
  warningLegal?: string
}

interface ContractFixModalProps {
  open: boolean
  onClose: () => void
  contractHtml: string
  contractType: string
  reviewResult: AIReviewResult
  workerId?: string
}

type ViewMode = 'side-by-side' | 'inline'

export function ContractFixModal({
  open,
  onClose,
  contractHtml,
  contractType,
  reviewResult,
  workerId,
}: ContractFixModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ContractFixResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<ViewMode>('side-by-side')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    contractId: string
    url: string
  } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    if (!open || result) return
    let cancelled = false

    void Promise.resolve().then(async () => {
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/ai/contract-fix', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contractHtml, contractType, reviewResult }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            body?.error ??
              `No pudimos generar la versión corregida (HTTP ${res.status})`,
          )
        }
        if (!cancelled) setResult(body.data as ContractFixResult)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, contractHtml, contractType, reviewResult, result])

  const fixedHtml = result?.fixedHtml

  // Diff word-level (cliente, sin libs externas) — memoizado, ~100-300ms para 5k palabras
  const diffTokens = useMemo(() => {
    if (!fixedHtml) return null
    const a = stripHtmlForDiff(contractHtml)
    const b = stripHtmlForDiff(fixedHtml)
    return diffWords(a, b)
  }, [contractHtml, fixedHtml])

  const stats = useMemo(() => (diffTokens ? diffStats(diffTokens) : null), [diffTokens])

  function handleCopyFixed() {
    if (!result?.fixedHtml) return
    navigator.clipboard.writeText(result.fixedHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveDraft() {
    if (!result?.fixedHtml) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/ai/contract-fix/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractType,
          title: `Contrato corregido por IA (${new Date().toLocaleDateString('es-PE')})`,
          fixedHtml: result.fixedHtml,
          originalHtml: contractHtml.slice(0, 5000),
          changes: result.changes,
          workerId,
          aiRiskScore: reviewResult.overallScore,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      setSaveResult({
        contractId: body.contract.id,
        url: body.contract.url,
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf() {
    if (!result) return
    setDownloadingPdf(true)
    try {
      const res = await fetch('/api/ai/contract-fix/pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `Contrato corregido (${contractType})`,
          fixedHtml: result.fixedHtml,
          summary: result.summary,
          warningLegal: result.warningLegal,
          changesCount: result.changes.length,
        }),
      })
      if (!res.ok) {
        throw new Error(`No pudimos generar el PDF (HTTP ${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contrato-corregido-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-fix-title"
      className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-[color:var(--bg-canvas)]"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 p-2 rounded-xl bg-emerald-50">
            <Sparkles className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Comply360 IA · Único en Perú
            </p>
            <h2
              id="contract-fix-title"
              className="text-lg font-bold text-[color:var(--text-primary)] truncate"
            >
              Versión corregida del contrato
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)] mt-0.5 truncate">
              Reescritura conforme a normativa peruana — lista para revisar con tu abogado
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {result && !saveResult && (
            <>
              {/* Toggle vista */}
              <div className="hidden md:inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setView('side-by-side')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                    view === 'side-by-side'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                  )}
                  title="Vista lado a lado"
                >
                  <Columns2 className="w-3 h-3" />
                  Lado a lado
                </button>
                <button
                  type="button"
                  onClick={() => setView('inline')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                    view === 'inline'
                      ? 'bg-emerald-600 text-white'
                      : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
                  )}
                  title="Vista combinada con cambios resaltados"
                >
                  <Combine className="w-3 h-3" />
                  Diff inline
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyFixed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition-colors"
                title="Copiar HTML corregido"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition-colors"
                title="Descargar PDF profesional con header Comply360"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                PDF
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-sm"
                title="Crear como Contract DRAFT en tu base de datos"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Guardando...' : 'Guardar como contrato'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-lg text-[color:var(--text-tertiary)] hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-auto p-5">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-[color:var(--text-primary)]">
                Generando versión corregida con IA...
              </p>
              <p className="text-sm text-[color:var(--text-secondary)] mt-1 max-w-md">
                Reescribiendo cláusulas según D.Leg. 728, Ley 29783 y normativa
                vigente. Toma 15-30 segundos.
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">No se pudo generar la versión corregida</p>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                <p className="text-xs text-red-700 mt-3">
                  El análisis original sigue siendo válido. Reintenta en un
                  momento o contacta a soporte si persiste.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner de éxito al guardar */}
        {saveResult && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 rounded-full bg-emerald-600">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-emerald-900">¡Contrato guardado como DRAFT!</h3>
                <p className="text-sm text-emerald-800 mt-1">
                  Ya puedes editarlo, asignarlo a un trabajador y enviarlo a firma biométrica desde la pantalla de Contratos.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <a
                    href={saveResult.url}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 transition-colors"
                  >
                    Abrir contrato
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm px-4 py-2 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && !loading && !error && !saveResult && (
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Summary banner */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="shrink-0 p-2 rounded-lg bg-emerald-600">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[color:var(--text-primary)]">
                    {result.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold">
                      {result.changes.length} cambios aplicados
                    </span>
                    {stats && stats.changePercent > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-semibold">
                        {stats.changePercent}% del texto modificado
                      </span>
                    )}
                    {stats && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                        +{stats.addedWords} / −{stats.removedWords} palabras
                      </span>
                    )}
                    {result.remainingRisks > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-semibold">
                        {result.remainingRisks} requieren tu input
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {result.warningLegal && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong>Aviso legal:</strong> {result.warningLegal}
                  </p>
                </div>
              )}
              {saveError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-900 leading-relaxed">
                    <strong>Error al guardar:</strong> {saveError}
                  </p>
                </div>
              )}
            </div>

            {/* Vista: side-by-side O inline diff */}
            {view === 'side-by-side' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Original */}
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <header className="px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">
                      <FileText className="inline w-3 h-3 mr-1" />
                      Original
                    </p>
                  </header>
                  <div
                    className="p-5 max-h-[500px] overflow-auto text-sm text-[color:var(--text-primary)] leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: contractHtml }}
                  />
                </section>

                {/* Corregido */}
                <section className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
                  <header className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      <Sparkles className="inline w-3 h-3 mr-1" />
                      Corregido por Comply360 IA
                    </p>
                  </header>
                  <div
                    className="p-5 max-h-[500px] overflow-auto text-sm text-[color:var(--text-primary)] leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: result.fixedHtml }}
                  />
                </section>
              </div>
            )}

            {view === 'inline' && diffTokens && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <header className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">
                    <Combine className="inline w-3 h-3 mr-1" />
                    Diff palabra por palabra
                  </p>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-400" />
                      Agregado
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-red-200 ring-1 ring-red-400" />
                      Removido
                    </span>
                  </div>
                </header>
                <div className="p-5 max-h-[600px] overflow-auto text-sm text-[color:var(--text-primary)] leading-relaxed font-serif whitespace-pre-wrap">
                  {diffTokens.map((token, i) => {
                    if (token.type === 'equal') {
                      return <span key={i}>{token.value}</span>
                    }
                    if (token.type === 'added') {
                      return (
                        <span
                          key={i}
                          className="bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/60 rounded px-0.5"
                          title="Texto agregado por Comply360 IA"
                        >
                          {token.value}
                        </span>
                      )
                    }
                    return (
                      <span
                        key={i}
                        className="bg-red-100 text-red-900 ring-1 ring-red-300/60 rounded px-0.5 line-through opacity-70"
                        title="Texto removido del original"
                      >
                        {token.value}
                      </span>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Lista de cambios aplicados */}
            {result.changes.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <header className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-bold text-[color:var(--text-primary)]">
                    Cambios aplicados ({result.changes.length})
                  </h3>
                </header>
                <ul className="divide-y divide-gray-100">
                  {result.changes.map((change, i) => (
                    <li key={i} className="p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center justify-center min-w-[60px] rounded-md text-[10px] font-bold uppercase tracking-widest px-2 py-1',
                            change.type === 'ADD' && 'bg-emerald-100 text-emerald-800',
                            change.type === 'MODIFY' && 'bg-amber-100 text-amber-800',
                            change.type === 'REMOVE' && 'bg-red-100 text-red-800',
                          )}
                        >
                          {change.type === 'ADD'
                            ? '+ Agregar'
                            : change.type === 'MODIFY'
                              ? '~ Modificar'
                              : '− Quitar'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                            {change.category}
                          </p>
                          <p className="text-xs text-[color:var(--text-secondary)] mt-1">
                            {change.reason}
                          </p>

                          {(change.before || change.after) && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {change.before && (
                                <div className="rounded-md bg-red-50 border border-red-200 p-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1">
                                    Antes
                                  </p>
                                  <p className="text-red-900 line-through opacity-70">
                                    {change.before.length > 200
                                      ? change.before.slice(0, 200) + '…'
                                      : change.before}
                                  </p>
                                </div>
                              )}
                              {change.after && (
                                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                                    Después
                                  </p>
                                  <p className="text-emerald-900">
                                    {change.after.length > 200
                                      ? change.after.slice(0, 200) + '…'
                                      : change.after}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {change.legalBasis && (
                            <p className="mt-2 text-[10px] font-mono text-[color:var(--text-tertiary)] flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              {change.legalBasis}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
