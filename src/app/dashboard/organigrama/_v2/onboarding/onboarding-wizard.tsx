/**
 * Wizard "Tu organigrama en 60 segundos".
 *
 * 3 pasos rápidos:
 *   1. Industria + tamaño + ubicación
 *   2. Generación IA + preview interactivo
 *   3. Aplicar al organigrama real
 *
 * Si la IA falla, el usuario igual recibe una propuesta determinística
 * (fallback templates). Después del aplicar, recarga el árbol para que el
 * canvas se llene.
 */
'use client'

import { useState, useTransition } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertTriangle,
  Wand2,
  ScrollText,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  OnboardingInput,
  OnboardingProposal,
} from '@/lib/orgchart/onboarding-ai'

interface OnboardingWizardProps {
  onClose: () => void
  onApplied?: () => void
}

type WizardStep = 'input' | 'preview' | 'applied'

const SIZES: Array<{
  value: 'MICRO' | 'PEQUEÑA' | 'MEDIANA' | 'GRANDE'
  label: string
  detail: string
  range: string
}> = [
  { value: 'MICRO', label: 'Microempresa', detail: '1–10 trabajadores', range: '1–10' },
  { value: 'PEQUEÑA', label: 'Pequeña', detail: '11–100 trabajadores', range: '11–100' },
  { value: 'MEDIANA', label: 'Mediana', detail: '101–250 trabajadores', range: '101–250' },
  { value: 'GRANDE', label: 'Grande', detail: '+250 trabajadores', range: '+250' },
]

const INDUSTRY_SUGGESTIONS = [
  'Retail / comercio',
  'Servicios profesionales',
  'Consultoría',
  'Manufactura',
  'Construcción',
  'Restaurantes',
  'Educación',
  'Salud',
  'Transporte',
  'Tecnología',
]

export function OnboardingWizard({ onClose, onApplied }: OnboardingWizardProps) {
  const [step, setStep] = useState<WizardStep>('input')
  const [input, setInput] = useState<OnboardingInput>({
    industry: '',
    sizeRange: 'PEQUEÑA',
    workerCount: 30,
    city: 'Lima',
    description: '',
  })
  const [proposal, setProposal] = useState<OnboardingProposal | null>(null)
  const [source, setSource] = useState<'ai' | 'fallback' | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [, startApply] = useTransition()
  const [applying, setApplying] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/orgchart/onboarding-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'preview', input }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      setProposal(data.proposal)
      setSource(data.source)
      setWarnings(data.warnings ?? [])
      setStep('preview')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar propuesta')
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!proposal) return
    setApplying(true)
    try {
      const res = await fetch('/api/orgchart/onboarding-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'apply', input, proposal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      toast.success(
        `${data.unitsCreated} unidades y ${data.positionsCreated} cargos creados.`,
      )
      setStep('applied')
      startApply(() => {
        onApplied?.()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <m.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="flex max-h-[92vh] w-[min(900px,94vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                  Onboarding IA · 60 segundos
                </div>
                <h2 className="text-lg font-semibold">Tu organigrama en un minuto</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-emerald-100 transition hover:bg-white/10"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Progress steps */}
          <div className="mt-4 flex items-center gap-1">
            {(['input', 'preview', 'applied'] as WizardStep[]).map((s, i) => {
              const isCurrent = s === step
              const isPast =
                (step === 'preview' && s === 'input') ||
                (step === 'applied' && (s === 'input' || s === 'preview'))
              return (
                <div key={s} className="flex flex-1 items-center gap-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition ${
                      isCurrent || isPast ? 'bg-white' : 'bg-white/25'
                    }`}
                  />
                  {i < 2 && <div className="w-1" />}
                </div>
              )
            })}
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <m.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <p className="text-sm text-slate-600">
                  Cuéntanos lo básico de tu empresa. La IA propone un organigrama coherente
                  con la legislación peruana en menos de un minuto y tú lo ajustas como
                  quieras.
                </p>

                {/* Industria */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Industria o sector
                  </label>
                  <input
                    type="text"
                    value={input.industry}
                    onChange={(e) => setInput({ ...input, industry: e.target.value })}
                    placeholder="Ej. retail de moda, consultoría legal, restaurante…"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput({ ...input, industry: s })}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-800"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tamaño */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tamaño de la empresa
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {SIZES.map((s) => {
                      const active = input.sizeRange === s.value
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setInput({ ...input, sizeRange: s.value })}
                          className={`rounded-xl border p-3 text-left transition ${
                            active
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`text-sm font-semibold ${active ? 'text-emerald-800' : 'text-slate-900'}`}
                          >
                            {s.label}
                          </div>
                          <div className="text-[11px] text-slate-500">{s.detail}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Worker count */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Número aproximado de trabajadores
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={500}
                      value={input.workerCount}
                      onChange={(e) =>
                        setInput({ ...input, workerCount: Number(e.target.value) })
                      }
                      className="flex-1 accent-emerald-600"
                    />
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={input.workerCount}
                      onChange={(e) =>
                        setInput({
                          ...input,
                          workerCount: Math.max(1, Math.min(2000, Number(e.target.value) || 1)),
                        })
                      }
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm tabular-nums focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {input.workerCount >= 20 && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-emerald-700">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      Con ≥20 trabajadores se requiere Comité SST formal (Ley 29783 art. 29).
                    </p>
                  )}
                </div>

                {/* Ciudad */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ciudad principal (opcional)
                  </label>
                  <input
                    type="text"
                    value={input.city ?? ''}
                    onChange={(e) => setInput({ ...input, city: e.target.value })}
                    placeholder="Ej. Lima, Arequipa, Trujillo…"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Descripción extra */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Algo más sobre la empresa (opcional)
                  </label>
                  <textarea
                    value={input.description ?? ''}
                    onChange={(e) => setInput({ ...input, description: e.target.value })}
                    rows={2}
                    placeholder="Ej. tenemos 3 sedes y manejamos productos perecibles…"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </m.div>
            )}

            {step === 'preview' && proposal && (
              <m.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {source === 'fallback' && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      La IA no estuvo disponible. Te mostramos una propuesta predefinida
                      basada en tu sector. Igual la puedes ajustar después.
                    </span>
                  </div>
                )}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Wand2 className="h-3.5 w-3.5" />
                    Propuesta {source === 'ai' ? 'generada por IA' : 'predefinida'}
                  </div>
                  <p className="mt-1">{proposal.rationale}</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <PreviewMetric
                    label="Unidades"
                    value={proposal.units.length}
                    Icon={Building2}
                  />
                  <PreviewMetric
                    label="Cargos"
                    value={proposal.positions.length}
                    Icon={ScrollText}
                  />
                  <PreviewMetric
                    label="Roles legales sugeridos"
                    value={proposal.suggestedComplianceRoles.length}
                    Icon={Sparkles}
                  />
                </div>

                {warnings.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <strong className="block">Observaciones:</strong>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tree preview */}
                <div className="mt-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estructura propuesta
                  </h3>
                  <div className="max-h-[280px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <TreePreview proposal={proposal} />
                  </div>
                </div>

                {/* Roles sugeridos */}
                {proposal.suggestedComplianceRoles.length > 0 && (
                  <div className="mt-5">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Roles legales sugeridos
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.suggestedComplianceRoles.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                          title={r.reason}
                        >
                          {r.roleType.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </m.div>
            )}

            {step === 'applied' && (
              <m.div
                key="applied"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-8 w-8 text-emerald-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  ¡Listo! Tu organigrama está creado.
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Ya puedes ajustar unidades, asignar trabajadores y designar roles
                  legales. Revisa el Compliance Heatmap para ver dónde estás expuesto.
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer / nav */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Más tarde
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!input.industry.trim() || generating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generar con IA
                  </>
                )}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <ChevronLeft className="h-3 w-3" />
                Modificar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aplicando…
                  </>
                ) : (
                  <>
                    Aplicar al organigrama
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}
          {step === 'applied' && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Ir al organigrama
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </footer>
      </m.div>
    </div>
  )
}

function PreviewMetric({
  label,
  value,
  Icon,
}: {
  label: string
  value: number | string
  Icon: typeof Building2
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
    </div>
  )
}

interface TreePreviewProps {
  proposal: OnboardingProposal
}

function TreePreview({ proposal }: TreePreviewProps) {
  const childrenByParent = new Map<string | null, typeof proposal.units>()
  for (const u of proposal.units) {
    const list = childrenByParent.get(u.parentKey ?? null) ?? []
    list.push(u)
    childrenByParent.set(u.parentKey ?? null, list)
  }
  const positionsByUnit = new Map<string, typeof proposal.positions>()
  for (const q of proposal.positions) {
    const list = positionsByUnit.get(q.unitKey) ?? []
    list.push(q)
    positionsByUnit.set(q.unitKey, list)
  }

  return (
    <div className="space-y-1">
      {(childrenByParent.get(null) ?? []).map((u) => (
        <UnitBlock
          key={u.key}
          unit={u}
          depth={0}
          childrenByParent={childrenByParent}
          positionsByUnit={positionsByUnit}
        />
      ))}
    </div>
  )
}

function UnitBlock({
  unit,
  depth,
  childrenByParent,
  positionsByUnit,
}: {
  unit: OnboardingProposal['units'][number]
  depth: number
  childrenByParent: Map<string | null, OnboardingProposal['units']>
  positionsByUnit: Map<string, OnboardingProposal['positions']>
}) {
  const kids = childrenByParent.get(unit.key) ?? []
  const positions = positionsByUnit.get(unit.key) ?? []
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[12px]">
        <Users className="h-3 w-3 text-emerald-600" />
        <span className="font-medium text-slate-900">{unit.name}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
          {unit.kind}
        </span>
      </div>
      {positions.length > 0 && (
        <ul className="ml-5 mt-0.5 space-y-0.5">
          {positions.map((q) => (
            <li key={q.key} className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="text-emerald-500">·</span>
              {q.title}
              {q.seats > 1 && (
                <span className="text-slate-400">({q.seats})</span>
              )}
              {q.isManagerial && (
                <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                  jefe
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {kids.length > 0 && (
        <div className="mt-1 space-y-1">
          {kids.map((k) => (
            <UnitBlock
              key={k.key}
              unit={k}
              depth={depth + 1}
              childrenByParent={childrenByParent}
              positionsByUnit={positionsByUnit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
