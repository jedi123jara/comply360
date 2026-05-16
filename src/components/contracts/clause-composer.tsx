'use client'

/**
 * ClauseComposer — Generador de Contratos / Chunk 4
 *
 * Catálogo modular de cláusulas. El usuario:
 *   1. Ve qué cláusulas potestativas / causas objetivas están disponibles
 *   2. Elige una y completa sus variables
 *   3. Ve preview en vivo
 *   4. Inserta — el motor reescribe el contentHtml + crea ContractVersion
 *
 * El gating de severidad de Validation Engine (chunk 1) se beneficia
 * automáticamente: insertar PDP-001 hace que DATOS-001 pase de INFO a OK.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ScrollText,
  Loader2,
  X,
  CheckCircle2,
  Info,
  Trash2,
  Eye,
  Plus,
  Scale,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface ClauseVariable {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'textarea'
  default?: string | number
  required?: boolean
  helpText?: string
  options?: Array<{ value: string; label: string }>
}

interface CatalogClause {
  id: string
  code: string
  category: 'POTESTATIVA' | 'CAUSA_OBJETIVA' | 'OBLIGATORIA'
  type: string
  title: string
  bodyTemplate: string
  legalBasis: string
  variables: ClauseVariable[]
  applicableTo: { contractTypes?: string[] } | null
  version: string
}

interface SelectedClause {
  code: string
  version: string
  values: Record<string, string | number>
  position: number
  renderedText: string
  insertedAt: string
  insertedBy: string
}

interface Props {
  contractId: string
  contractType: string | null
  onChange?: () => void
}

const CATEGORY_LABELS: Record<CatalogClause['category'], string> = {
  POTESTATIVA: 'Cláusulas potestativas',
  CAUSA_OBJETIVA: 'Causas objetivas blindadas',
  OBLIGATORIA: 'Cláusulas obligatorias',
}

export function ClauseComposer({ contractId, contractType, onChange }: Props) {
  const { toast } = useToast()
  const [catalog, setCatalog] = useState<CatalogClause[]>([])
  const [selected, setSelected] = useState<SelectedClause[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<CatalogClause | null>(null)
  const [values, setValues] = useState<Record<string, string | number>>({})
  const [inserting, setInserting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      // Catálogo y contrato (para conocer las cláusulas ya seleccionadas)
      const [catRes, contractRes] = await Promise.all([
        fetch(`/api/contracts/clauses${contractType ? `?contractType=${contractType}` : ''}`),
        fetch(`/api/contracts/${contractId}`),
      ])
      if (!catRes.ok) throw new Error('catalog')
      const catData = await catRes.json()
      setCatalog(catData.data ?? [])

      if (contractRes.ok) {
        const cData = await contractRes.json()
        const fd = (cData.data?.formData ?? {}) as Record<string, unknown>
        setSelected((fd._selectedClauses as SelectedClause[] | undefined) ?? [])
      }
    } catch {
      toast({ title: 'No se pudo cargar el catálogo de cláusulas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [contractId, contractType, toast])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const grouped = useMemo(() => {
    const map: Record<CatalogClause['category'], CatalogClause[]> = {
      OBLIGATORIA: [],
      POTESTATIVA: [],
      CAUSA_OBJETIVA: [],
    }
    for (const c of catalog) map[c.category].push(c)
    return map
  }, [catalog])

  const selectedCodes = useMemo(() => new Set(selected.map((s) => s.code)), [selected])

  function openClause(c: CatalogClause) {
    setActive(c)
    // Pre-fill con defaults o último valor usado
    const prev = selected.find((s) => s.code === c.code)
    if (prev) {
      setValues(prev.values)
    } else {
      const init: Record<string, string | number> = {}
      for (const v of c.variables) {
        if (v.default !== undefined) init[v.key] = v.default
      }
      setValues(init)
    }
  }

  // Preview en vivo: render del lado cliente
  const preview = useMemo(() => {
    if (!active) return ''
    const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
    const defaults: Record<string, string | number> = {}
    for (const v of active.variables) if (v.default !== undefined) defaults[v.key] = v.default
    return active.bodyTemplate.replace(PLACEHOLDER_RE, (_m, key) => {
      const val = values[key]
      const eff = val !== undefined && val !== '' ? val : defaults[key]
      return eff !== undefined ? String(eff) : `[FALTA: ${key}]`
    })
  }, [active, values])

  async function insertClause() {
    if (!active) return
    setInserting(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/insert-clause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauseCode: active.code,
          values,
          appendToContent: true,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al insertar')
      }
      const data = await res.json()
      setSelected(data.data.selectedClauses)
      toast({
        title: `Cláusula ${active.code} insertada ✓`,
        description: 'Se actualizó el contenido del contrato y se creó una nueva versión.',
        type: 'success',
      })
      setActive(null)
      onChange?.()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Error al insertar',
        type: 'error',
      })
    } finally {
      setInserting(false)
    }
  }

  async function removeClause(code: string) {
    setRemoving(code)
    try {
      const res = await fetch(`/api/contracts/${contractId}/insert-clause?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSelected(data.data.selectedClauses)
      toast({
        title: `Cláusula ${code} retirada de la selección`,
        description: 'El texto en el contrato no se modificó automáticamente — edítalo manualmente si corresponde.',
        type: 'success',
      })
    } catch {
      toast({ title: 'Error al retirar la cláusula', type: 'error' })
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cláusulas ya insertadas */}
      {selected.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {selected.length} cláusula{selected.length === 1 ? '' : 's'} insertada{selected.length === 1 ? '' : 's'}
          </h3>
          <div className="space-y-2">
            {selected.map((s) => {
              const meta = catalog.find((c) => c.code === s.code)
              return (
                <div
                  key={s.code}
                  className="flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                >
                  <ScrollText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {meta?.title ?? s.code}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      {s.code} · v{s.version} · insertada {new Date(s.insertedAt).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                  <button
                    onClick={() => meta && openClause(meta)}
                    disabled={!meta}
                    className="text-xs text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeClause(s.code)}
                    disabled={removing === s.code}
                    className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {removing === s.code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Quitar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Catálogo agrupado */}
      {(['CAUSA_OBJETIVA', 'POTESTATIVA', 'OBLIGATORIA'] as const).map((cat) => {
        const items = grouped[cat]
        if (items.length === 0) return null
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((c) => {
                const isSelected = selectedCodes.has(c.code)
                return (
                  <button
                    key={c.code}
                    onClick={() => openClause(c)}
                    className={cn(
                      'text-left p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      <span className="text-sm font-semibold text-slate-900">{c.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{c.code}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {catalog.length === 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-800">
          <Info className="w-4 h-4 inline mr-2" />
          El catálogo de cláusulas no está sembrado. Ejecuta el seeder:
          <code className="ml-1 bg-white/80 px-1 rounded">npm run db:seed</code>.
        </div>
      )}

      {/* Modal: editor de cláusula con preview */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setActive(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-slate-900 truncate">{active.title}</h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{active.code} · v{active.version}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden flex-1">
              {/* Variables */}
              <div className="overflow-y-auto p-4 space-y-3 border-r border-slate-100">
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <Scale className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{active.legalBasis}</p>
                </div>

                {active.variables.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    Esta cláusula no requiere variables — texto fijo.
                  </p>
                )}

                {active.variables.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {v.label}
                      {v.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {v.type === 'textarea' ? (
                      <textarea
                        value={String(values[v.key] ?? '')}
                        onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                        rows={3}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    ) : v.type === 'select' ? (
                      <select
                        value={String(values[v.key] ?? '')}
                        onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white"
                      >
                        <option value="">Selecciona…</option>
                        {(v.options ?? []).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={v.type === 'number' ? 'number' : v.type === 'date' ? 'date' : 'text'}
                        value={values[v.key] !== undefined ? String(values[v.key]) : ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          setValues((prev) => ({
                            ...prev,
                            [v.key]: v.type === 'number' && raw !== '' ? Number(raw) : raw,
                          }))
                        }}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2"
                      />
                    )}
                    {v.helpText && <p className="text-xs text-slate-500">{v.helpText}</p>}
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="overflow-y-auto p-4 bg-slate-50">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-2">
                  <Eye className="w-3.5 h-3.5" />
                  Vista previa
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white border border-slate-200 rounded-lg p-3">
                  {preview}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setActive(null)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={insertClause}
                disabled={inserting}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {inserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {selectedCodes.has(active.code) ? 'Actualizar cláusula' : 'Insertar cláusula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
