'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutTemplate, Loader2, Sparkles, UsersRound } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { alertsKey, treeKey } from '../data'

interface OrgTemplateSummary {
  id: string
  name: string
  description: string
  sector: string
  unitCount: number
  positionCount: number
  recommendedFor: string[]
  recommendation?: {
    score: number
    level: 'STRONG' | 'GOOD' | 'NEUTRAL'
    reasons: string[]
    signals: string[]
  }
}

interface TemplatePreview {
  template: OrgTemplateSummary
  totals: {
    unitsToCreate: number
    positionsToCreate: number
    reusedUnits: number
    reusedPositions: number
    warnings: number
  }
  units: Array<{ key: string; name: string; kind: string; status: string }>
  positions: Array<{ key: string; title: string; unitName: string; status: string; warning: string | null }>
}

const COMMISSION_TEMPLATE_IDS = new Set([
  'comite-sst-paritario',
  'supervisor-sst',
  'brigada-emergencia',
  'comision-investigadora',
  'equipo-temporal-auditoria',
  'equipo-auditoria-sunafil',
  'comision-risst',
])

export function TemplatesModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const view = useOrgStore((s) => s.view)
  const queryClient = useQueryClient()
  const open = activeModal === 'templates'
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const templatesQuery = useQuery({
    queryKey: ['orgchart', 'templates'],
    queryFn: async () => {
      const res = await fetch('/api/orgchart/templates', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      return (json.templates ?? []) as OrgTemplateSummary[]
    },
    enabled: open,
    staleTime: 60_000,
  })

  const visibleTemplates = useMemo(() => {
    const ordered = [...(templatesQuery.data ?? [])].sort((a, b) => {
      const aCommission = COMMISSION_TEMPLATE_IDS.has(a.id) ? 0 : 1
      const bCommission = COMMISSION_TEMPLATE_IDS.has(b.id) ? 0 : 1
      return aCommission - bCommission || a.name.localeCompare(b.name)
    })
    return view === 'committees'
      ? ordered.filter((template) => COMMISSION_TEMPLATE_IDS.has(template.id))
      : ordered
  }, [templatesQuery.data, view])

  const effectiveSelectedId = selectedId ?? visibleTemplates[0]?.id ?? null

  const previewQuery = useQuery({
    queryKey: ['orgchart', 'templates', effectiveSelectedId],
    queryFn: async () => {
      if (!effectiveSelectedId) return null
      const res = await fetch(
        `/api/orgchart/templates?templateId=${encodeURIComponent(effectiveSelectedId)}`,
        { cache: 'no-store' },
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return (await res.json()) as TemplatePreview
    },
    enabled: open && Boolean(effectiveSelectedId),
    staleTime: 15_000,
  })

  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch('/api/orgchart/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      return res.json()
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
        queryClient.invalidateQueries({ queryKey: ['orgchart', 'templates'] }),
      ])
      toast.success('Plantilla aplicada al organigrama')
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo aplicar la plantilla')
    },
  })

  const preview = previewQuery.data

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Plantillas listas"
      subtitle="Crea estructuras de empresa, comités o equipos temporales sin partir desde cero"
      icon={<LayoutTemplate className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Se reutilizan unidades existentes cuando el nombre coincide.
          </p>
          <button
            type="button"
            onClick={() => effectiveSelectedId && applyMutation.mutate(effectiveSelectedId)}
            disabled={!effectiveSelectedId || applyMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {applyMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Aplicar plantilla
          </button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <div className="space-y-2">
          {templatesQuery.isLoading && (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {visibleTemplates.map((template) => {
            const selected = template.id === effectiveSelectedId
            const isCommission = COMMISSION_TEMPLATE_IDS.has(template.id)
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCommission && <UsersRound className="h-4 w-4 text-emerald-700" />}
                  <span className="text-sm font-semibold text-slate-900">{template.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {template.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge>{template.sector}</Badge>
                  <Badge>{template.unitCount} unidades</Badge>
                  <Badge>{template.positionCount} cargos</Badge>
                </div>
              </button>
            )
          })}
        </div>

        <div className="min-h-[420px] rounded-xl border border-slate-200 bg-slate-50 p-4">
          {previewQuery.isLoading && (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {preview && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {preview.template.name}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{preview.template.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Metric label="Unidades nuevas" value={preview.totals.unitsToCreate} />
                <Metric label="Cargos nuevos" value={preview.totals.positionsToCreate} />
                <Metric label="Unidades reutilizadas" value={preview.totals.reusedUnits} />
                <Metric label="Cargos reutilizados" value={preview.totals.reusedPositions} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <PreviewList
                  title="Unidades"
                  items={preview.units.map((unit) => `${unit.name} · ${unit.kind}`)}
                />
                <PreviewList
                  title="Cargos"
                  items={preview.positions.map((position) => `${position.title} · ${position.unitName}`)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      {children}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  )
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
        {items.slice(0, 8).map((item) => (
          <li key={item} className="truncate">
            {item}
          </li>
        ))}
      </ul>
      {items.length > 8 && (
        <p className="mt-2 text-[10px] text-slate-500">+{items.length - 8} más</p>
      )}
    </div>
  )
}
