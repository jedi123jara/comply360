'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, ShieldCheck, BookOpen, Users, Download, Loader2,
  ChevronRight, Info, CheckCircle2, AlertCircle, X, Eye,
  Scale, ClipboardList, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentField {
  id: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency' | 'toggle' | 'email'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  helpText?: string
  condition?: { field: string; value: string | boolean | number }
}

interface DocumentSection {
  id: string
  title: string
  description?: string
  fields: DocumentField[]
}

interface DocumentTemplate {
  id: string
  type: string
  name: string
  description: string
  legalBasis: string
  mandatoryFrom?: string
  workerThreshold?: number
  approvalAuthority?: string
  sectionCount: number
  fieldCount: number
  sections: DocumentSection[]
}

// ─── Template Icons ───────────────────────────────────────────────────────────

const TEMPLATE_META: Record<string, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  badge: string
  badgeColor: string
}> = {
  'politica-hostigamiento-sexual': {
    icon: ShieldCheck,
    color: 'bg-rose-50 border-rose-200',
    badge: 'Obligatorio',
    badgeColor: 'bg-red-100 text-red-700',
  },
  'plan-anual-sst': {
    icon: ClipboardList,
    color: 'bg-emerald-50 border-emerald-200',
    badge: 'SST — Ley 29783',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  'reglamento-interno-trabajo': {
    icon: BookOpen,
    color: 'bg-blue-50 border-blue-200',
    badge: '+100 trabajadores',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  'cuadro-categorias-funciones': {
    icon: Users,
    color: 'bg-amber-50 border-amber-200',
    badge: 'Igualdad Salarial',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
}

const DEFAULT_META = {
  icon: FileText,
  color: 'bg-[color:var(--neutral-50)] border-white/[0.08]',
  badge: 'Documento',
  badgeColor: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]',
}

const TEMPLATE_BY_QUERY_TYPE: Record<string, string> = {
  REGLAMENTO_SST: 'plan-anual-sst',
  PLAN_SST: 'plan-anual-sst',
  POLITICA_HOSTIGAMIENTO: 'politica-hostigamiento-sexual',
  POLITICA_IGUALDAD: 'ccf-ley-30709',
  CCF: 'ccf-ley-30709',
  RIT: 'reglamento-interno-trabajo',
}

const QUERY_TYPE_LABELS: Record<string, string> = {
  REGLAMENTO_SST: 'SST',
  PLAN_SST: 'Plan anual SST',
  POLITICA_HOSTIGAMIENTO: 'Política de hostigamiento sexual',
  POLITICA_IGUALDAD: 'Igualdad salarial',
  CCF: 'Cuadro de categorías y funciones',
  RIT: 'Reglamento Interno de Trabajo',
}

// ─── Render a single form field ───────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  formValues,
}: {
  field: DocumentField
  value: string
  onChange: (id: string, val: string) => void
  formValues: Record<string, string>
}) {
  // Evaluate conditional visibility
  if (field.condition) {
    const condVal = formValues[field.condition.field]
    if (String(condVal) !== String(field.condition.value)) return null
  }

  const baseClass = 'w-full rounded-lg border border-white/[0.08] bg-white px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-transparent transition-all'

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.helpText && (
          <p className="text-xs text-gray-500">{field.helpText}</p>
        )}
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className={cn(baseClass, 'resize-y min-h-[80px]')}
        />
      </div>
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.helpText && (
          <p className="text-xs text-gray-500">{field.helpText}</p>
        )}
        <select
          value={value}
          onChange={e => onChange(field.id, e.target.value)}
          className={baseClass}
        >
          <option value="">Seleccionar…</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between py-1">
        <div>
          <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
            {field.label}
          </label>
          {field.helpText && (
            <p className="text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(field.id, value === 'true' ? 'false' : 'true')}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
            value === 'true' ? 'bg-blue-600' : 'bg-gray-200'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow mt-0.5 transition-transform',
              value === 'true' ? 'translate-x-5.5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    )
  }

  const inputType =
    field.type === 'currency' ? 'number' :
    field.type === 'email' ? 'email' :
    field.type === 'date' ? 'date' :
    field.type === 'number' ? 'number' :
    'text'

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[color:var(--text-secondary)]">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}
      <input
        type={inputType}
        value={value}
        onChange={e => onChange(field.id, e.target.value)}
        placeholder={field.placeholder}
        className={baseClass}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentosPage() {
  const searchParams = useSearchParams()
  const requestedType = searchParams.get('tipo')?.trim() ?? ''
  const contractId = searchParams.get('contractId')?.trim() ?? ''
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DocumentTemplate | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [autoSelectedType, setAutoSelectedType] = useState<string | null>(null)
  const [qualityRefresh, setQualityRefresh] = useState<{
    status: 'idle' | 'running' | 'done' | 'failed'
    passing?: boolean
    score?: number
    blockers?: number
  }>({ status: 'idle' })

  // Load templates on mount
  useEffect(() => {
    fetch('/api/documentos/generar')
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  const openTemplate = useCallback((tmpl: DocumentTemplate) => {
    setSelected(tmpl)
    setFormValues({})
    setError(null)
    setSuccess(false)
    setQualityRefresh({ status: 'idle' })
  }, [])

  const closeTemplate = useCallback(() => {
    setSelected(null)
    setError(null)
    setSuccess(false)
    setAutoSelectedType(null)
    setQualityRefresh({ status: 'idle' })
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (loading || templates.length === 0 || selected || autoSelectedType === requestedType) return
      const templateId = TEMPLATE_BY_QUERY_TYPE[requestedType]
      if (!templateId) return
      const template = templates.find((item) => item.id === templateId || item.type === requestedType)
      if (!template) return
      setAutoSelectedType(requestedType)
      setSelected(template)
      setFormValues({})
      setError(null)
      setSuccess(false)
      setQualityRefresh({ status: 'idle' })
    })
    return () => {
      cancelled = true
    }
  }, [autoSelectedType, loading, requestedType, selected, templates])

  const handleFieldChange = useCallback((id: string, val: string) => {
    setFormValues(prev => ({ ...prev, [id]: val }))
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!selected) return
    setGenerating(true)
    setError(null)

    try {
      // Convert toggle 'true'/'false' to booleans
      const variables: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(formValues)) {
        variables[k] = v === 'true' ? true : v === 'false' ? false : v
      }

      const res = await fetch('/api/documentos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selected.id, variables }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.missingFields) {
          setError(`Completa los campos obligatorios: ${(data.missingFields as string[]).join(', ')}`)
        } else {
          setError(data.error || 'Error generando el documento')
        }
        return
      }

      // Open document in new window and trigger print dialog
      const win = window.open('', '_blank', 'width=900,height=700')
      if (win) {
        win.document.write(data.html)
        win.document.close()
        setTimeout(() => {
          win.focus()
          win.print()
        }, 500)
        setSuccess(true)
        if (contractId) {
          setQualityRefresh({ status: 'running' })
          const qualityRes = await fetch(`/api/contracts/${contractId}/quality`, {
            method: 'POST',
          })
          const qualityData = await qualityRes.json().catch(() => null)
          if (qualityRes.ok && qualityData?.data?.quality) {
            setQualityRefresh({
              status: 'done',
              passing: Boolean(qualityData.data.passing),
              score: Number(qualityData.data.quality.score ?? 0),
              blockers: Array.isArray(qualityData.data.quality.blockers)
                ? qualityData.data.quality.blockers.length
                : 0,
            })
          } else {
            setQualityRefresh({ status: 'failed' })
          }
        }
      } else {
        setError('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.')
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setGenerating(false)
    }
  }, [contractId, selected, formValues])

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-[color:var(--neutral-100)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Form modal / sidebar ──────────────────────────────────────────────────────
  if (selected) {
    const meta = TEMPLATE_META[selected.id] ?? DEFAULT_META
    const requestedLabel = requestedType ? QUERY_TYPE_LABELS[requestedType] ?? requestedType : ''

    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Back button + header */}
        <div className="flex items-start gap-4">
          <button
            onClick={closeTemplate}
            className="mt-0.5 rounded-lg p-2 hover:bg-[color:var(--neutral-100)] transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', meta.badgeColor)}>
                {meta.badge}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white leading-tight">{selected.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{selected.description}</p>
          </div>
        </div>

        {/* Legal basis */}
        {requestedLabel && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-800">
              <span className="font-semibold">Acción desde contrato: </span>
              estás generando evidencia para desbloquear {requestedLabel}. Al generar, quedará persistida como documento de empresa.
            </div>
          </div>
        )}

        {/* Legal basis */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <Scale className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800">
            <span className="font-semibold">Base legal: </span>
            {selected.legalBasis}
          </div>
        </div>

        {/* Error / success */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                Documento generado y persistido. Se abrió en una ventana nueva lista para imprimir o guardar como PDF.
              </p>
            </div>
            {contractId && (
              <div className="rounded-md border border-emerald-200 bg-white p-3">
                {qualityRefresh.status === 'running' && (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Recalculando calidad del contrato...
                  </div>
                )}
                {qualityRefresh.status === 'done' && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-emerald-800">
                      Calidad recalculada: <span className="font-semibold">{qualityRefresh.score}/100</span>
                      {' '}· {qualityRefresh.blockers} blocker(s)
                      {qualityRefresh.passing ? ' · listo para emisión oficial' : ' · aún requiere acciones'}
                    </p>
                    <Link
                      href={`/dashboard/contratos/${contractId}`}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Volver al contrato
                    </Link>
                  </div>
                )}
                {qualityRefresh.status === 'failed' && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-amber-700">
                      El documento se generó, pero no se pudo recalcular la calidad automáticamente.
                    </p>
                    <Link
                      href={`/dashboard/contratos/${contractId}`}
                      className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Volver y revisar
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form sections */}
        <div className="space-y-6">
          {selected.sections.map(section => (
            <div key={section.id} className="bg-white rounded-xl border border-white/[0.08] p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white">{section.title}</h2>
                {section.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map(field => (
                  <div
                    key={field.id}
                    className={cn(
                      field.type === 'textarea' && 'col-span-full',
                      field.type === 'toggle' && 'col-span-full'
                    )}
                  >
                    <FieldInput
                      field={field}
                      value={formValues[field.id] ?? ''}
                      onChange={handleFieldChange}
                      formValues={formValues}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Generate button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            * Campos obligatorios. La fecha de elaboración se completa automáticamente.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold text-black font-bold rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generar y Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Template gallery ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Documentos"
        title="Archivo digital con <em>firma + trazabilidad</em>."
        subtitle="Documentos laborales obligatorios pre-redactados conforme a la legislación peruana vigente. Completa los datos de tu empresa y descarga en PDF listo para firmar."
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">¿Por qué son obligatorios?</p>
          <p className="text-sm text-amber-700 mt-0.5">
            SUNAFIL puede exigir estos documentos en cualquier inspección. No tenerlos generan multas
            de entre 1 y 100 UIT (S/ 5,500 – S/ 550,000). Genera los documentos en minutos y protege
            tu empresa.
          </p>
        </div>
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No se pudieron cargar los templates</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {templates.map(tmpl => {
            const meta = TEMPLATE_META[tmpl.id] ?? DEFAULT_META
            const Icon = meta.icon
            return (
              <button
                key={tmpl.id}
                onClick={() => openTemplate(tmpl)}
                className={cn(
                  'group text-left rounded-2xl border-2 p-5 transition-all hover:shadow-md hover:-translate-y-0.5',
                  meta.color
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl bg-white shadow-sm p-2.5">
                    <Icon className="h-6 w-6 text-[color:var(--text-secondary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', meta.badgeColor)}>
                        {meta.badge}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-snug">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                      {tmpl.description}
                    </p>

                    {/* Metadata pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tmpl.workerThreshold !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs bg-white/70 border border-white/[0.08] rounded-full px-2 py-0.5 text-gray-600">
                          <Users className="h-3 w-3" />
                          Desde {tmpl.workerThreshold} trabajador{tmpl.workerThreshold !== 1 ? 'es' : ''}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs bg-white/70 border border-white/[0.08] rounded-full px-2 py-0.5 text-gray-600">
                        <ClipboardList className="h-3 w-3" />
                        {tmpl.fieldCount} campo{tmpl.fieldCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Legal basis */}
                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                      <Scale className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{tmpl.legalBasis}</span>
                    </p>
                  </div>
                </div>

                {/* CTA arrow */}
                <div className="flex items-center justify-end mt-3 text-xs font-semibold text-gray-600 group-hover:text-white transition-colors">
                  <span>Generar documento</span>
                  <ChevronRight className="h-4 w-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* How it works */}
      <div className="bg-[color:var(--neutral-50)] rounded-2xl border border-white/[0.08] p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-600" />
          ¿Cómo funciona?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Elige el documento', desc: 'Selecciona el documento que necesitas generar.' },
            { step: '2', title: 'Completa los datos', desc: 'Ingresa los datos de tu empresa — el sistema pre-llena el texto legal.' },
            { step: '3', title: 'Descarga en PDF', desc: 'Se abre una vista de impresión. Guarda como PDF o imprime directamente.' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 bg-white rounded-lg border border-white/[0.08] p-3">
          <Lock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            Los documentos se generan localmente — tus datos no se almacenan en la nube de COMPLY360.
            El registro de generación queda en el log de auditoría de tu empresa.
          </p>
        </div>
      </div>
    </div>
  )
}
