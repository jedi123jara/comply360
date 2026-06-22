/**
 * Modal "Comités obligatorios" — catálogo de los comités/comisiones que la ley
 * peruana obliga según el tamaño de la empresa, con su estado (ya lo tienes /
 * te falta / no aplica) y un wizard paso a paso para asignar sus cargos.
 *
 * Fuente de verdad legal: `src/lib/orgchart/comites-obligatorios.ts`.
 */
'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Check,
  Plus,
  Loader2,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  FileText,
  ArrowLeft,
  Search,
  Scale,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'
import { useWorkersRosterQuery, type RosterWorker } from '../data/queries/use-workers'
import {
  evaluarComitesObligatorios,
  obligacionCubierta,
  APPLICABILITY_ORDER,
  APPLICABILITY_LABEL,
  type ComiteApplicability,
  type ComiteResolved,
} from '@/lib/orgchart/comites-obligatorios'
import { findingExposure } from '@/lib/orgchart/legal-exposure'
import type { OrgChartTree } from '@/lib/orgchart/types'

interface Demographics {
  workerCount: number
  womenCount: number
  womenFertileCount: number
  processesPersonalData: boolean
}

/** Comité SST autoritativo (módulo SST Premium) — fuente de verdad legal. */
interface SstComite {
  id: string
  estado: string
  // NULL = Comité principal del empleador; con sedeId = Subcomité de sede (Art. 44).
  sedeId: string | null
  mandatoFin: string
  diasRestantesMandato: number
  miembros: Array<{ id: string }>
  analisis: { cumple: boolean }
}

/** Resultado del read-back: si el módulo SST está disponible y el comité vigente. */
interface SstComiteState {
  available: boolean
  comite: SstComite | null
}

const solesFmt = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

const APPLICABILITY_STYLE: Record<ComiteApplicability, string> = {
  obligatorio: 'bg-rose-100 text-rose-700',
  recomendado: 'bg-sky-100 text-sky-700',
  condicional: 'bg-amber-100 text-amber-700',
  'no-aplica': 'bg-slate-100 text-slate-500',
}

export function ComitesCatalogoModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'comites-catalogo'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const rosterQuery = useWorkersRosterQuery(open)
  const demographicsQuery = useQuery<Demographics>({
    queryKey: ['orgchart', 'demographics'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/orgchart/demographics')
      if (!res.ok) throw new Error('No se pudo cargar la demografía de la empresa')
      return res.json() as Promise<Demographics>
    },
  })
  // Read-back del Comité SST autoritativo (módulo SST Premium). Es un realce
  // progresivo: si la org no tiene el plan SST (403) o falla, devolvemos
  // available=false y el catálogo cae al comportamiento basado en el organigrama.
  const sstComiteQuery = useQuery<SstComiteState>({
    queryKey: ['orgchart', 'sst-comite-vigente'],
    enabled: open,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/sst/comites?estado=VIGENTE')
      if (!res.ok) return { available: false, comite: null }
      const json = await res.json()
      // La obligación legal "sst" del catálogo es el Comité PRINCIPAL del
      // empleador (sedeId NULL), no un subcomité de sede (Art. 44). Lo elegimos
      // explícitamente y SIN fallback a subcomité: si solo hay subcomités
      // vigentes (sin principal), la obligación principal NO está cubierta
      // (covered=false) — pintar un subcomité como "el del empleador" engañaría.
      const comites = (json.comites ?? []) as SstComite[]
      const principal = comites.find((c) => c.sedeId == null) ?? null
      return { available: true, comite: principal }
    },
  })
  const sstState = sstComiteQuery.data ?? { available: false, comite: null }

  const tree = treeQuery.data ?? null
  const demo = demographicsQuery.data

  // El contexto (nº de trabajadores, mujeres, mujeres fértiles, tratamiento de
  // datos) viene del endpoint agregado, para resolver las obligaciones
  // condicionales (lactario / asistenta social / DPO) sin dejarlas en "según tu caso".
  const workerCount = demo?.workerCount ?? 0
  const resolved = useMemo(() => {
    const list = evaluarComitesObligatorios({
      workerCount: demo?.workerCount ?? 0,
      womenCount: demo?.womenCount,
      womenFertileCount: demo?.womenFertileCount,
      processesPersonalData: demo?.processesPersonalData,
    })
    return [...list].sort(
      (a, b) => APPLICABILITY_ORDER[a.applicability] - APPLICABILITY_ORDER[b.applicability],
    )
  }, [demo])

  const [assignUnitId, setAssignUnitId] = useState<string | null>(null)
  const [creatingId, setCreatingId] = useState<string | null>(null)

  const handleClose = () => {
    setAssignUnitId(null)
    setCreatingId(null)
    closeModal()
  }

  /** Devuelve el id de la unidad existente que cubre la obligación, o null. */
  const coveredUnitId = (obligacionId: string): string | null =>
    tree?.units.find((u) => obligacionCubierta(obligacionId, [u.name]))?.id ?? null

  // Espeja la unidad del comité SST al módulo SST Premium (best-effort) y
  // refresca el estado para que la tarjeta pase a "Gestionar en SST".
  const reconcileSst = async (orgUnitId: string) => {
    try {
      const res = await fetch('/api/orgchart/comite-sst/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUnitId }),
      })
      if (res.ok) await sstComiteQuery.refetch()
    } catch {
      // best-effort: si falla, el siguiente assign reintenta.
    }
  }

  const createTemplate = async (item: ComiteResolved) => {
    if (!item.templateId) return
    setCreatingId(item.obligacion.id)
    try {
      const res = await fetch('/api/orgchart/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: item.templateId }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'No se pudo crear')
      }
      // La respuesta del apply trae las unidades creadas/reusadas (con su nombre
      // exacto), lo que nos deja ubicar la unidad correcta sin depender del regex.
      const applied = (await res.json().catch(() => null)) as
        | { units?: Array<{ name: string; status?: string }> }
        | null
      toast.success(`${item.resolvedTitle} creado`)
      // refetchQueries SÍ espera a que el refetch termine (a diferencia de
      // invalidateQueries), así getQueryData devuelve el árbol ya fresco.
      await queryClient.refetchQueries({ queryKey: treeKey(null) })
      queryClient.invalidateQueries({ queryKey: alertsKey }).catch(() => {})
      const fresh = queryClient.getQueryData<OrgChartTree>(treeKey(null))
      const appliedUnitName = applied?.units?.find((u) =>
        obligacionCubierta(item.obligacion.id, [u.name]),
      )?.name
      const unit = appliedUnitName
        ? fresh?.units.find((u) => u.name === appliedUnitName)
        : fresh?.units.find((u) => obligacionCubierta(item.obligacion.id, [u.name]))
      if (unit) {
        // Si es el comité SST y la org tiene el módulo, enlaza/crea el ComiteSST
        // ANTES de abrir el wizard para que el estado quede fresco.
        if (item.obligacion.id === 'sst' && sstState.available) await reconcileSst(unit.id)
        setAssignUnitId(unit.id)
      } else {
        toast.info('Comité creado. Ábrelo desde el catálogo para asignar sus cargos.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setCreatingId(null)
    }
  }

  const assignUnit = assignUnitId ? tree?.units.find((u) => u.id === assignUnitId) ?? null : null

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={assignUnit ? `Asignar cargos — ${assignUnit.name}` : 'Comités obligatorios'}
      subtitle={
        assignUnit
          ? 'Asigna un trabajador a cada cargo del comité, uno por uno.'
          : 'Los comités y designaciones que la ley peruana te obliga a tener, según tu tamaño de empresa.'
      }
      icon={assignUnit ? <UserPlus className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      width="xl"
    >
      {assignUnit && tree ? (
        <AssignWizard
          key={assignUnit.id}
          tree={tree}
          unitId={assignUnit.id}
          roster={rosterQuery.data ?? []}
          onBack={() => setAssignUnitId(null)}
          onDone={handleClose}
          onAfterAssign={
            sstState.available && obligacionCubierta('sst', [assignUnit.name])
              ? () => {
                  void reconcileSst(assignUnit.id)
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {treeQuery.isLoading || rosterQuery.isLoading || demographicsQuery.isLoading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rosterQuery.isError || treeQuery.isError || demographicsQuery.isError ? (
            // Sin estos datos no podemos saber el tamaño de la empresa y los
            // umbrales resolverían mal. Mejor mostrar un error que un catálogo falso.
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-7 w-7 text-amber-500" />
              <p className="max-w-sm text-sm text-slate-600">
                No pudimos cargar los datos de la empresa (trabajadores u organigrama).
                Sin esto no podemos calcular qué comités te corresponden.
              </p>
              <button
                type="button"
                onClick={() => {
                  rosterQuery.refetch()
                  treeQuery.refetch()
                  demographicsQuery.refetch()
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
              </button>
            </div>
          ) : (
            <>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Tu empresa tiene <strong className="text-slate-700">{workerCount}</strong> trabajadores
                {demo && demo.womenCount > 0 && (
                  <>
                    {' '}
                    ({demo.womenCount} mujeres
                    {demo.womenFertileCount > 0
                      ? `, ${demo.womenFertileCount} en edad fértil`
                      : ''}
                    )
                  </>
                )}
                . El umbral clave es <strong>20</strong> (comité paritario vs. responsable único).
              </p>
              {resolved.map((item) => {
                const unitId = coveredUnitId(item.obligacion.id)
                const isSst = item.obligacion.id === 'sst'
                // Para SST, el Comité SST del módulo SST Premium es la fuente de
                // verdad legal (mandato, elecciones, actas): si existe y está
                // vigente, prevalece sobre la unidad del organigrama.
                const sstComite = isSst ? sstState.comite : null
                const covered = sstComite ? true : Boolean(unitId)
                const isDoc = item.obligacion.kind === 'documento'
                const muted = item.applicability === 'no-aplica'
                // Exposición a multa SUNAFIL de NO tener la obligación (peor caso),
                // solo para las que faltan y son obligatorias/recomendadas.
                const multa =
                  !covered &&
                  (item.applicability === 'obligatorio' || item.applicability === 'recomendado')
                    ? findingExposure(item.obligacion.severity, workerCount)
                    : null
                return (
                  <div
                    key={item.obligacion.id}
                    className={`rounded-xl border p-3 transition ${
                      muted ? 'border-slate-100 bg-slate-50/60 opacity-70' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {item.resolvedTitle}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${APPLICABILITY_STYLE[item.applicability]}`}
                          >
                            {APPLICABILITY_LABEL[item.applicability]}
                          </span>
                          {covered && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <Check className="h-3 w-3" /> Ya lo tienes
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Scale className="h-3 w-3" /> {item.obligacion.legalBasis}
                        </p>
                        {multa != null && multa > 0 && (
                          <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                            Exposición a multa: hasta {solesFmt.format(multa)}
                          </p>
                        )}
                        {sstComite && (
                          <p
                            className={`mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                              sstComite.diasRestantesMandato < 0 || !sstComite.analisis.cumple
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Comité SST {sstComite.estado.toLowerCase()} · {sstComite.miembros.length}{' '}
                            miembros ·{' '}
                            {sstComite.diasRestantesMandato < 0
                              ? 'mandato VENCIDO'
                              : `vence en ${sstComite.diasRestantesMandato} días`}
                            {!sstComite.analisis.cumple ? ' · composición incompleta' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                        {isDoc ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                            <FileText className="h-3.5 w-3.5" /> Documento
                          </span>
                        ) : sstComite ? (
                          <a
                            href="/dashboard/sst/comite"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                            title="El Comité SST se gestiona en el módulo SST (mandato, miembros, elecciones, actas)"
                          >
                            Gestionar en SST <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : covered ? (
                          <button
                            type="button"
                            onClick={() => unitId && setAssignUnitId(unitId)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Asignar cargos
                          </button>
                        ) : muted ? null : (
                          <button
                            type="button"
                            onClick={() => createTemplate(item)}
                            disabled={creatingId === item.obligacion.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {creatingId === item.obligacion.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Crear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </ModalShell>
  )
}

// ─── Wizard de asignación paso a paso ────────────────────────────────────────

function AssignWizard({
  tree,
  unitId,
  roster,
  onBack,
  onDone,
  onAfterAssign,
}: {
  tree: OrgChartTree
  unitId: string
  roster: RosterWorker[]
  onBack: () => void
  onDone: () => void
  /** Hook tras una asignación exitosa (p.ej. espejar al Comité SST). */
  onAfterAssign?: () => void
}) {
  const queryClient = useQueryClient()

  // Cargos del comité, los críticos primero.
  const positions = useMemo(
    () =>
      tree.positions
        .filter((p) => p.orgUnitId === unitId)
        .sort((a, b) => (b.isCritical ? 1 : 0) - (a.isCritical ? 1 : 0)),
    [tree.positions, unitId],
  )

  const [step, setStep] = useState(0)
  const [search, setSearch] = useState('')
  const [assigning, setAssigning] = useState(false)

  const total = positions.length
  const pos = positions[step]

  // Cobertura global (asientos cubiertos / asientos totales).
  const { filledSeats, totalSeats } = useMemo(() => {
    let filled = 0
    let totalS = 0
    for (const p of positions) {
      const seats = p.seats ?? 1
      totalS += seats
      const occ = tree.assignments.filter((a) => a.positionId === p.id && !a.endedAt).length
      filled += Math.min(occ, seats)
    }
    return { filledSeats: filled, totalSeats: totalS }
  }, [positions, tree.assignments])

  if (total === 0 || !pos) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-slate-600">Este comité aún no tiene cargos definidos.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al catálogo
        </button>
      </div>
    )
  }

  const seats = pos.seats ?? 1
  const occupants = tree.assignments.filter((a) => a.positionId === pos.id && !a.endedAt)
  const isFull = occupants.length >= seats
  const assignedWorkerIds = new Set(occupants.map((o) => o.workerId))

  const filteredRoster = roster
    .filter((w) => !assignedWorkerIds.has(w.id))
    .filter((w) =>
      `${w.firstName} ${w.lastName} ${w.dni}`.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .slice(0, 8)

  const assign = async (workerId: string) => {
    setAssigning(true)
    try {
      const res = await fetch('/api/orgchart/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          positionId: pos.id,
          isPrimary: true,
          isInterim: false,
          capacityPct: 100,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'No se pudo asignar')
      }
      toast.success('Cargo asignado')
      setSearch('')
      // refetchQueries espera el refetch → el árbol (y los ocupantes) quedan
      // frescos antes de re-render, sin mostrar al recién asignado como libre.
      await queryClient.refetchQueries({ queryKey: treeKey(null) })
      onAfterAssign?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setAssigning(false)
    }
  }

  const isLast = step >= total - 1

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Cargo {step + 1} de {total}
          </span>
          <span>
            {filledSeats}/{totalSeats} asientos cubiertos
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: totalSeats ? `${(filledSeats / totalSeats) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Cargo actual */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-slate-900">{pos.title}</span>
            {pos.isCritical && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Crítico
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {occupants.length}/{seats} ocupado{seats > 1 ? 's' : ''}
          </span>
        </div>

        {/* Ocupantes actuales */}
        {occupants.length > 0 && (
          <ul className="mt-2 space-y-1">
            {occupants.map((o) => (
              <li
                key={o.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800"
              >
                <Check className="h-3 w-3" /> {o.worker.firstName} {o.worker.lastName}
              </li>
            ))}
          </ul>
        )}

        {/* Buscador + asignación */}
        {isFull ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            Este cargo ya está completo.
          </p>
        ) : (
          <div className="mt-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Busca un trabajador por nombre o DNI…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {filteredRoster.length === 0 ? (
                <li className="px-2 py-3 text-center text-xs text-slate-400">
                  {roster.length === 0
                    ? 'No hay trabajadores registrados.'
                    : 'Sin coincidencias.'}
                </li>
              ) : (
                filteredRoster.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => assign(w.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-left text-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <span className="min-w-0 truncate">
                        {w.firstName} {w.lastName}
                        <span className="ml-1 text-[11px] text-slate-400">DNI {w.dni}</span>
                      </span>
                      <UserPlus className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Catálogo
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Check className="h-3.5 w-3.5" /> Listo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Siguiente <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
