/**
 * Panel "Comités obligatorios" — checklist de compliance SIEMPRE VISIBLE en la
 * vista Comisiones (antes solo vivía en un modal). Muestra de un vistazo qué
 * comités/designaciones obliga la ley según el tamaño de la empresa, cuáles ya
 * tienes y cuáles te faltan con su exposición a multa. Las acciones pesadas
 * (crear / asignar cargos) abren el modal `comites-catalogo` que ya existe.
 *
 * Fuente de verdad legal: src/lib/orgchart/comites-obligatorios.ts.
 */
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Check, Loader2, AlertTriangle, FileText, ArrowRight, Settings2 } from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import {
  evaluarComitesObligatorios,
  obligacionCubierta,
  APPLICABILITY_ORDER,
  APPLICABILITY_LABEL,
} from '@/lib/orgchart/comites-obligatorios'
import { findingExposure } from '@/lib/orgchart/legal-exposure'

interface Demographics {
  workerCount: number
  womenCount: number
  womenFertileCount: number
  processesPersonalData: boolean
}

interface SstComiteState {
  available: boolean
  comite: { id: string } | null
}

const solesFmt = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

export function ComitesObligatoriosPanel() {
  const openModal = useOrgStore((s) => s.openModal)
  const treeQuery = useTreeQuery(null)
  const demoQuery = useQuery<Demographics>({
    queryKey: ['orgchart', 'demographics'],
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/orgchart/demographics')
      if (!res.ok) throw new Error('No se pudo cargar la demografía de la empresa')
      return res.json() as Promise<Demographics>
    },
  })
  // Read-back del Comité SST autoritativo (módulo SST Premium). Si existe el
  // comité PRINCIPAL del empleador (sedeId null) vigente, la obligación "sst"
  // está cubierta aunque no haya unidad SST en el organigrama. Mismo criterio y
  // misma queryKey que el modal comites-catalogo (comparten caché) → así el
  // panel no muestra una multa CRÍTICA falsa que el modal contradiría.
  const sstComiteQuery = useQuery<SstComiteState>({
    queryKey: ['orgchart', 'sst-comite-vigente'],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/sst/comites?estado=VIGENTE')
      if (!res.ok) return { available: false, comite: null }
      const json = await res.json()
      const comites = (json.comites ?? []) as Array<{ id: string; sedeId: string | null }>
      const principal = comites.find((c) => c.sedeId == null) ?? null
      return { available: true, comite: principal }
    },
  })

  const tree = treeQuery.data ?? null
  const demo = demoQuery.data
  const sstCovered = Boolean(sstComiteQuery.data?.comite)

  const items = useMemo(() => {
    if (!demo) return []
    const list = evaluarComitesObligatorios({
      workerCount: demo.workerCount,
      womenCount: demo.womenCount,
      womenFertileCount: demo.womenFertileCount,
      processesPersonalData: demo.processesPersonalData,
    })
    const sorted = [...list].sort(
      (a, b) => APPLICABILITY_ORDER[a.applicability] - APPLICABILITY_ORDER[b.applicability],
    )
    return sorted.map((item) => {
      // Para SST, el Comité SST del módulo SST Premium prevalece sobre la unidad
      // del organigrama (igual que el modal): si existe el principal vigente,
      // está cubierto aunque no haya unidad SST en el árbol.
      const covered =
        (item.obligacion.id === 'sst' && sstCovered) ||
        Boolean(tree?.units.find((u) => obligacionCubierta(item.obligacion.id, [u.name])))
      const obligatoria =
        item.applicability === 'obligatorio' || item.applicability === 'recomendado'
      const multa =
        !covered && obligatoria ? findingExposure(item.obligacion.severity, demo.workerCount) : 0
      return { item, covered, obligatoria, multa, muted: item.applicability === 'no-aplica' }
    })
  }, [demo, tree, sstCovered])

  const faltan = items.filter((r) => !r.covered && r.obligatoria).length
  const cubiertos = items.filter((r) => r.covered && r.obligatoria).length
  const totalObligatorias = items.filter((r) => r.obligatoria).length
  const totalMulta = items.reduce((s, r) => s + r.multa, 0)
  const loading = treeQuery.isLoading || demoQuery.isLoading || sstComiteQuery.isLoading

  return (
    <aside className="hidden w-[300px] flex-shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      {/* Header */}
      <div className="border-b border-slate-100 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Comités obligatorios</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Lo que la ley te obliga según tu tamaño de empresa.
        </p>
        {!loading && totalObligatorias > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                faltan === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {cubiertos}/{totalObligatorias} cumplidos
            </span>
            {totalMulta > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                Riesgo: {solesFmt.format(totalMulta)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-slate-400">
            No se pudo calcular el catálogo de comités.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map(({ item, covered, multa, muted }) => (
              <li key={item.obligacion.id}>
                <button
                  type="button"
                  onClick={() => openModal('comites-catalogo')}
                  className={`group flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ${
                    muted
                      ? 'border-slate-100 bg-slate-50/60 opacity-70'
                      : covered
                        ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {item.obligacion.kind === 'documento' ? (
                      <FileText className="h-4 w-4 text-slate-400" />
                    ) : covered ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : muted ? (
                      <span className="block h-4 w-4 rounded-full border border-slate-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-800">
                      {item.resolvedTitle}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {covered ? 'Ya lo tienes' : APPLICABILITY_LABEL[item.applicability]}
                    </span>
                    {multa > 0 && (
                      <span className="mt-1 inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                        Multa: hasta {solesFmt.format(multa)}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition group-hover:text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Acción */}
      <div className="border-t border-slate-100 p-2.5">
        <button
          type="button"
          onClick={() => openModal('comites-catalogo')}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Gestionar comités
        </button>
      </div>
    </aside>
  )
}
