'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  FileText,
  Save,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { GeneratedDocument, GeneratorType } from '@/lib/generators/types'

/**
 * Shell compartido por todos los generadores: header + form (children) +
 * preview de resultado + CTAs (descargar PDF, guardar). Elimina duplicación
 * entre los 15 generadores de documentos compliance.
 *
 * El children recibe `onGenerate(params)` y debe llamar con los params
 * tipados del generador correspondiente.
 */

export interface GeneratorShellProps {
  type: GeneratorType
  title: string
  description: string
  baseLegal: string
  gravity: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  estimatedMinutes: number
  /** Formulario específico del generador. Recibe `onSubmit` que dispara generate. */
  renderForm: (args: {
    onSubmit: (params: unknown) => void | Promise<void>
    loading: boolean
  }) => React.ReactNode
}

export function GeneratorShell({
  type,
  title,
  description,
  baseLegal,
  gravity,
  estimatedMinutes,
  renderForm,
}: GeneratorShellProps) {
  const [result, setResult] = useState<GeneratedDocument | null>(null)
  const [orgDocumentId, setOrgDocumentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(params: unknown) {
    setLoading(true)
    setError(null)
    setResult(null)
    setOrgDocumentId(null)
    try {
      const res = await fetch('/api/compliance-docs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, params, persist: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setResult(data.document as GeneratedDocument)
      setOrgDocumentId(data.orgDocumentId ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar el documento')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPdf() {
    if (!result) return
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch('/api/compliance-docs/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: result }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateSlug = new Date().toISOString().slice(0, 10)
      link.download = `COMPLY360_${type}_${dateSlug}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setOrgDocumentId(null)
    setError(null)
  }

  const gravityClass =
    gravity === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : gravity === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
          <Link href="/dashboard/generadores" className="hover:text-emerald-700">
            ← Generadores
          </Link>
        </div>

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                gravityClass,
              )}
            >
              {gravity.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-[color:var(--text-tertiary)]">
              ~{estimatedMinutes} min
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
            {description}
          </p>
          <p className="mt-1 text-xs font-mono text-[color:var(--text-tertiary)]">{baseLegal}</p>
        </div>

        {!result ? (
          /* Form view */
          <div>{renderForm({ onSubmit: handleGenerate, loading })}</div>
        ) : (
          /* Result view */
          <ResultPreview
            result={result}
            orgDocumentId={orgDocumentId}
            downloading={downloading}
            onDownload={handleDownloadPdf}
            onReset={handleReset}
          />
        )}

        {error ? (
          <div className="rounded-lg border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-700 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        ) : null}
      </div>
    </main>
  )
}

/* ── Result preview ──────────────────────────────────────────────── */

function ResultPreview({
  result,
  orgDocumentId,
  downloading,
  onDownload,
  onReset,
}: {
  result: GeneratedDocument
  orgDocumentId: string | null
  downloading: boolean
  onDownload: () => void
  onReset: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-emerald-900">Documento generado</p>
          <p className="text-sm text-emerald-800 mt-0.5">
            {orgDocumentId ? (
              <>
                Guardado en tu legajo corporativo (ID <code className="font-mono text-xs">{orgDocumentId.slice(-8)}</code>).
                Descarga el PDF para imprimir y firmar.
              </>
            ) : (
              <>Descarga el PDF para imprimir y firmar.</>
            )}
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onDownload}
          disabled={downloading}
          icon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        >
          {downloading ? 'Generando PDF…' : 'Descargar PDF'}
        </Button>
        <Button variant="secondary" onClick={onReset} icon={<ArrowLeft className="h-4 w-4" />}>
          Generar otra vez
        </Button>
        {orgDocumentId ? (
          <Link
            href="/dashboard/documentos"
            className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:border-emerald-300 px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] transition-colors"
          >
            <Save className="h-4 w-4" />
            Ver en legajo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {/* Preview sections */}
      <Card padding="lg">
        <CardHeader className="!p-0 !pb-4 !border-none">
          <div>
            <CardTitle>{result.title}</CardTitle>
            <CardDescription>
              {result.sections.length} secciones · {result.legalBasis.length} bases legales referenciadas
            </CardDescription>
          </div>
          <Badge variant="emerald" size="sm">
            Preview
          </Badge>
        </CardHeader>
        <CardContent className="!p-0 space-y-4">
          {result.sections.map((section) => (
            <div
              key={section.id}
              className="border-l-2 border-emerald-300 pl-4 py-1"
            >
              <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">
                {section.numbering}. {section.title}
              </p>
              <div className="mt-1 text-sm text-[color:var(--text-primary)] leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
              {section.baseLegal ? (
                <p className="mt-2 text-[10px] font-mono text-[color:var(--text-tertiary)]">
                  {section.baseLegal}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legal basis */}
      {result.legalBasis.length > 0 ? (
        <Card padding="md" variant="outline">
          <p className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
            Bases legales referenciadas
          </p>
          <ul className="space-y-1 text-xs text-[color:var(--text-secondary)]">
            {result.legalBasis.map((ref, i) => (
              <li key={i} className="font-mono">
                • {ref}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}
