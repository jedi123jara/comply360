/**
 * Copiloto IA del Organigrama — panel inline tipo "comando natural".
 *
 * El usuario escribe lo que quiere ("crea una subgerencia comercial con jefe
 * y 2 ejecutivos"), y el sistema le muestra el diff propuesto con cards por
 * operación + notas legales antes de confirmar.
 */
'use client'

import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useOrgStore } from '../state/org-store'
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Plus,
  UserPlus,
  Move,
  ShieldCheck,
  AlertCircle,
  X,
  Wand2,
} from 'lucide-react'

import type { CopilotPlan, CopilotOperation } from '@/lib/orgchart/copilot/operations'
import { treeKey } from '../data/queries/use-tree'
import { snapshotsKey } from '../data/queries/use-snapshots'
import { alertsKey } from '../data/queries/use-alerts'

interface CopilotPanelProps {
  open: boolean
  onClose: () => void
}

const PROMPT_SUGGESTIONS = [
  'Crea una subgerencia comercial con jefe y 3 ejecutivos',
  'Agrega un comité de hostigamiento con 4 miembros paritarios',
  'Mueve el área de Marketing para que reporte a Comercial',
  'Designa un DPO en el área de Sistemas',
]

export function CopilotPanel({ open, onClose }: CopilotPanelProps) {
  const queryClient = useQueryClient()
  const setCopilotPreviewPlan = useOrgStore((s) => s.setCopilotPreviewPlan)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [plan, setPlan] = useState<CopilotPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sincronizar el plan al store para que el canvas lo dibuje como ghost nodes
  useEffect(() => {
    setCopilotPreviewPlan(plan)
    return () => setCopilotPreviewPlan(null)
  }, [plan, setCopilotPreviewPlan])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setError(null)
    setPlan(null)
    try {
      const res = await fetch('/api/orgchart/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'plan', prompt }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? `Error ${res.status}`)
      }
      setPlan(data.plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando plan')
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!plan) return
    setApplying(true)
    try {
      const res = await fetch('/api/orgchart/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'apply', plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)

      toast.success(
        `${data.unitsCreated} unidades, ${data.positionsCreated} cargos, ${data.workersAssigned} asignaciones aplicadas.`,
      )

      // Invalidar queries para refrescar canvas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: snapshotsKey }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])

      setPlan(null)
      setCopilotPreviewPlan(null)
      setPrompt('')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error aplicando plan')
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <m.aside
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-40 flex h-screen w-[440px] flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Copiloto IA</h2>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Beta
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/80 transition hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {!plan && !generating && (
            <>
              <p className="text-sm text-slate-600">
                Escribe lo que quieres cambiar en tu organigrama y la IA te muestra el
                plan antes de aplicarlo.
              </p>
              <div className="mt-3 space-y-1.5">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <Wand2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Pensando un plan…
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Analizando tu organigrama y la legislación peruana.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="h-3.5 w-3.5" />
                Error generando plan
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {plan && !generating && (
            <PlanPreview plan={plan} onClear={() => setPlan(null)} />
          )}
        </div>

        {/* Footer / input */}
        <footer className="border-t border-slate-200 bg-slate-50 p-3">
          {plan ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlan(null)
                  setPrompt('')
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Empezar de nuevo
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Aplicando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Aplicar plan
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
                placeholder="Describe lo que quieres cambiar…"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                disabled={generating}
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Generar plan"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </footer>
      </m.aside>
    </AnimatePresence>
  )
}

function PlanPreview({
  plan,
  onClear,
}: {
  plan: CopilotPlan
  onClear: () => void
}) {
  const counts = plan.operations.reduce(
    (acc, op) => {
      acc[op.op] = (acc[op.op] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Plan propuesto
        </div>
        <p className="mt-1 leading-relaxed">{plan.rationale}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
        {Object.entries(counts).map(([op, n]) => (
          <div
            key={op}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-700"
          >
            <span className="font-bold tabular-nums">{n}</span>{' '}
            <span className="text-slate-500">{opLabel(op)}</span>
          </div>
        ))}
      </div>

      {plan.legalNotes && plan.legalNotes.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <div className="font-semibold">Notas legales</div>
          <ul className="mt-1 space-y-1">
            {plan.legalNotes.map((n, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Operaciones ({plan.operations.length})
      </h3>
      <div className="space-y-1.5">
        {plan.operations.map((op, i) => (
          <OperationCard key={i} op={op} />
        ))}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-[11px] text-slate-500 hover:text-slate-700"
      >
        Descartar plan
      </button>
    </div>
  )
}

function OperationCard({ op }: { op: CopilotOperation }) {
  if (op.op === 'createUnit') {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
          <Plus className="h-3 w-3" />
          Nueva unidad
        </div>
        <div className="ml-4 mt-0.5 text-xs">
          <span className="font-semibold text-slate-900">{op.name}</span>{' '}
          <span className="text-[10px] text-slate-500">({op.kind})</span>
        </div>
      </div>
    )
  }
  if (op.op === 'createPosition') {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
          <Plus className="h-3 w-3" />
          Nuevo cargo {op.isManagerial && '· Jefatura'}
        </div>
        <div className="ml-4 mt-0.5 text-xs">
          <span className="font-semibold text-slate-900">{op.title}</span>
          {op.seats > 1 && <span className="text-slate-500"> × {op.seats}</span>}
        </div>
      </div>
    )
  }
  if (op.op === 'assignWorker') {
    return (
      <div className="rounded-md border border-sky-200 bg-sky-50/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-800">
          <UserPlus className="h-3 w-3" />
          Asignar trabajador
        </div>
        <div className="ml-4 mt-0.5 text-[11px] text-slate-700">
          a cargo {op.positionRef.startsWith('p_') ? 'nuevo' : 'existente'}
        </div>
      </div>
    )
  }
  if (op.op === 'movePosition') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
          <Move className="h-3 w-3" />
          Mover cargo
        </div>
        <div className="ml-4 mt-0.5 text-[11px] text-slate-700">
          a {op.newParentRef ?? 'sin padre'}
        </div>
      </div>
    )
  }
  if (op.op === 'requireRole') {
    return (
      <div className="rounded-md border border-violet-200 bg-violet-50/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-violet-800">
          <ShieldCheck className="h-3 w-3" />
          Designar rol legal
        </div>
        <div className="ml-4 mt-0.5">
          <div className="text-xs font-semibold text-slate-900">
            {op.roleType.replace(/_/g, ' ')}
          </div>
          <div className="text-[10px] text-slate-500">{op.reason}</div>
        </div>
      </div>
    )
  }
  return null
}

function opLabel(op: string): string {
  switch (op) {
    case 'createUnit':
      return 'unidad(es)'
    case 'createPosition':
      return 'cargo(s)'
    case 'assignWorker':
      return 'asignación(es)'
    case 'movePosition':
      return 'mover'
    case 'requireRole':
      return 'rol legal'
    default:
      return op
  }
}

// Suprimir lint warning de ChevronRight no usado (lo dejé por si se necesita)
void ChevronRight
