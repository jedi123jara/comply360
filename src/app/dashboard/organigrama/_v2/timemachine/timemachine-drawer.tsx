/**
 * Time Machine drawer — visualización cinemática del histórico de snapshots.
 *
 * Layout (drawer inferior, alto ~200px):
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ [Track horizontal con tarjetas-snapshot]   [info playhead] [×] │
 *   │ ◀───●─────────────────────────●──────────────────────────────▶ │
 *   │ Ene 2026                                              Hoy      │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * El usuario hace click en un snapshot del track o arrastra el playhead.
 * Al cambiar de snapshot, el canvas re-renderea con animaciones framer-motion
 * (los nodos comunes interpolan posición, los nuevos entran fade-in, los
 * eliminados salen fade-out). Esto es el "morph" del plan.
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  History,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  GitCompare,
} from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import { useSnapshotsQuery } from '../data/queries/use-snapshots'
import type { OrgChartSnapshotDTO } from '@/lib/orgchart/types'

export function TimeMachineDrawer() {
  const open = useOrgStore((s) => s.timemachineOpen)
  const setOpen = useOrgStore((s) => s.setTimemachineOpen)
  const currentId = useOrgStore((s) => s.currentSnapshotId)
  const setCurrentId = useOrgStore((s) => s.setCurrentSnapshotId)
  const compareId = useOrgStore((s) => s.compareSnapshotId)
  const setCompareId = useOrgStore((s) => s.setCompareSnapshotId)

  const snapshotsQuery = useSnapshotsQuery()

  const sorted = useMemo(() => {
    const list = snapshotsQuery.data ?? []
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }, [snapshotsQuery.data])

  const totalSlots = sorted.length + 1 // +1 = "Actual (live)"
  const currentIndex = currentId
    ? sorted.findIndex((s) => s.id === currentId)
    : sorted.length

  const [playing, setPlaying] = useState(false)
  const [showDiffModal, setShowDiffModal] = useState(false)

  // Auto-play: avanza 1 snapshot/2.5s
  useEffect(() => {
    if (!playing || sorted.length === 0) return
    const timer = setInterval(() => {
      const next = currentIndex + 1
      if (next >= totalSlots) {
        setPlaying(false)
        setCurrentId(null) // volver a actual
        return
      }
      setCurrentId(sorted[next]?.id ?? null)
    }, 2500)
    return () => clearInterval(timer)
  }, [playing, currentIndex, sorted, totalSlots, setCurrentId])

  if (!open) return null

  const handleSelect = (index: number) => {
    if (index >= sorted.length) {
      setCurrentId(null)
    } else {
      setCurrentId(sorted[index].id)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) handleSelect(currentIndex - 1)
  }
  const goNext = () => {
    if (currentIndex < totalSlots - 1) handleSelect(currentIndex + 1)
  }

  return (
    <>
      <m.div
        initial={{ y: 240 }}
        animate={{ y: 0 }}
        exit={{ y: 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="text-xs font-semibold text-slate-900">Time Machine</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
              {sorted.length} snapshot{sorted.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowDiffModal(true)}
              disabled={sorted.length < 2}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GitCompare className="h-3 w-3" />
              Comparar
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              disabled={sorted.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {playing ? 'Pausar' : 'Reproducir'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body — track + playhead */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              aria-label="Snapshot anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex-1 overflow-x-auto pb-1">
              <div className="flex items-stretch gap-2">
                {sorted.map((s, i) => (
                  <SnapshotCard
                    key={s.id}
                    snapshot={s}
                    isCurrent={currentId === s.id}
                    isCompare={compareId === s.id}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        setCompareId(s.id === compareId ? null : s.id)
                      } else {
                        setCurrentId(s.id)
                      }
                    }}
                    index={i + 1}
                  />
                ))}
                {/* "Actual" slot */}
                <button
                  type="button"
                  onClick={() => setCurrentId(null)}
                  className={`flex w-32 flex-shrink-0 flex-col rounded-lg border-2 border-dashed px-3 py-2 text-left text-xs transition ${
                    currentId === null
                      ? 'border-emerald-400 bg-emerald-50 shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      currentId === null ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    Actual
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-900">
                    En vivo
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">Sin snapshot</div>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= totalSlots - 1}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              aria-label="Snapshot siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Playhead progress bar */}
          <div className="mt-2 px-7">
            <div className="relative h-1 rounded-full bg-slate-100">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300"
                style={{
                  width: totalSlots > 0 ? `${((currentIndex + 1) / totalSlots) * 100}%` : '0%',
                }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-600 shadow transition-all duration-300"
                style={{
                  left: totalSlots > 0
                    ? `calc(${((currentIndex + 1) / totalSlots) * 100}% - 6px)`
                    : '0%',
                }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>
                {sorted[0]
                  ? new Date(sorted[0].createdAt).toLocaleDateString('es-PE')
                  : 'Inicio'}
              </span>
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </m.div>

      {showDiffModal && (
        <SnapshotDiffModal onClose={() => setShowDiffModal(false)} snapshots={sorted} />
      )}
    </>
  )
}

interface SnapshotCardProps {
  snapshot: OrgChartSnapshotDTO
  isCurrent: boolean
  isCompare: boolean
  onClick: (e: React.MouseEvent) => void
  index: number
}

function SnapshotCard({ snapshot, isCurrent, isCompare, onClick, index }: SnapshotCardProps) {
  const date = new Date(snapshot.createdAt)
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        snapshot.isAuto
          ? `Auto-snapshot · shift+click para comparar`
          : `${snapshot.label} · shift+click para comparar`
      }
      className={`flex w-48 flex-shrink-0 flex-col items-stretch rounded-lg border-2 px-2 py-1.5 text-left text-xs transition ${
        isCurrent
          ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
          : isCompare
            ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {/* Thumbnail SVG del organigrama */}
      <div className="relative h-12 overflow-hidden rounded bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/orgchart/snapshots/${encodeURIComponent(snapshot.id)}/thumbnail.svg`}
          alt={`Estructura ${snapshot.label}`}
          className="h-full w-full object-contain"
          loading="lazy"
        />
        <div className="absolute right-1 top-1 flex items-center gap-0.5">
          <span className="rounded bg-slate-900/60 px-1 text-[8px] font-bold text-white">
            #{index}
          </span>
          {snapshot.isAuto && (
            <span className="rounded bg-slate-200 px-1 text-[8px] font-bold text-slate-700">
              AUTO
            </span>
          )}
        </div>
      </div>
      <div className="mt-1.5 truncate text-[12px] font-semibold text-slate-900">
        {snapshot.label}
      </div>
      <div className="mt-0.5 text-[10px] text-slate-500">
        {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
        <span title="Trabajadores">
          <strong className="tabular-nums">{snapshot.workerCount}</strong>w
        </span>
        <span title="Unidades">
          <strong className="tabular-nums">{snapshot.unitCount}</strong>u
        </span>
        <span className="ml-auto truncate font-mono text-[9px] text-slate-400">
          #{snapshot.hash.slice(0, 6)}
        </span>
      </div>
    </button>
  )
}

interface SnapshotDiffModalProps {
  onClose: () => void
  snapshots: OrgChartSnapshotDTO[]
}

interface SnapshotDiff {
  addedUnits?: Array<{ id: string; name: string }>
  removedUnits?: Array<{ id: string; name: string }>
  addedAssignments?: Array<{ workerId: string }>
  removedAssignments?: Array<{ workerId: string }>
}

interface NarrativeData {
  text: string
  highlights: string[]
  source: 'ai' | 'deterministic'
}

function SnapshotDiffModal({ onClose, snapshots }: SnapshotDiffModalProps) {
  const [fromId, setFromId] = useState(snapshots[0]?.id ?? '')
  const [toId, setToId] = useState(snapshots[snapshots.length - 1]?.id ?? '')
  const [diff, setDiff] = useState<SnapshotDiff | null>(null)
  const [narrative, setNarrative] = useState<NarrativeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDiff = useCallback(async () => {
    if (!fromId || !toId || fromId === toId) {
      setError('Elige dos snapshots distintos')
      return
    }
    setLoading(true)
    setError(null)
    setNarrative(null)
    try {
      const [diffRes, narrativeRes] = await Promise.all([
        fetch(
          `/api/orgchart/snapshots/diff?fromId=${encodeURIComponent(fromId)}&toId=${encodeURIComponent(toId)}`,
          { cache: 'no-store' },
        ),
        fetch(
          `/api/orgchart/snapshots/diff/narrative?fromId=${encodeURIComponent(fromId)}&toId=${encodeURIComponent(toId)}`,
          { cache: 'no-store' },
        ),
      ])
      const diffData = await diffRes.json()
      if (!diffRes.ok) throw new Error(diffData?.error ?? `Error ${diffRes.status}`)
      setDiff(diffData)
      if (narrativeRes.ok) {
        const narrativeData = (await narrativeRes.json()) as NarrativeData
        setNarrative(narrativeData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error obteniendo diff')
    } finally {
      setLoading(false)
    }
  }, [fromId, toId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      fetchDiff()
    })
    return () => {
      cancelled = true
    }
  }, [fetchDiff])

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <m.div
          initial={{ scale: 0.95, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-[min(800px,92vw)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold">Comparar snapshots</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Desde
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.createdAt).toLocaleDateString('es-PE')} · {s.label}
                  </option>
                ))}
              </select>
            </div>
            <ChevronRight className="mt-4 h-4 w-4 text-slate-400" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Hasta
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
              >
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.createdAt).toLocaleDateString('es-PE')} · {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loading && (
              <div className="py-12 text-center text-sm text-slate-500">
                Calculando diferencias…
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}
            {!loading && !error && diff && (
              <>
                {narrative && (
                  <NarrativeBlock narrative={narrative} />
                )}
                <DiffSummary diff={diff} />
              </>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  )
}

function DiffSummary({ diff }: { diff: SnapshotDiff }) {
  const addedUnits = diff.addedUnits ?? []
  const removedUnits = diff.removedUnits ?? []
  const addedAssignments = diff.addedAssignments ?? []
  const removedAssignments = diff.removedAssignments ?? []

  const totalChanges =
    addedUnits.length +
    removedUnits.length +
    addedAssignments.length +
    removedAssignments.length

  if (totalChanges === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Sin diferencias estructurales entre estos snapshots.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <DiffStat label="Unidades agregadas" value={addedUnits.length} tone="emerald" />
        <DiffStat label="Unidades removidas" value={removedUnits.length} tone="rose" />
        <DiffStat
          label="Asignaciones nuevas"
          value={addedAssignments.length}
          tone="emerald"
        />
        <DiffStat
          label="Asignaciones removidas"
          value={removedAssignments.length}
          tone="rose"
        />
      </div>

      {addedUnits.length > 0 && (
        <DiffList
          title="Unidades agregadas"
          items={addedUnits.map((u) => u.name)}
          tone="emerald"
        />
      )}
      {removedUnits.length > 0 && (
        <DiffList
          title="Unidades removidas"
          items={removedUnits.map((u) => u.name)}
          tone="rose"
        />
      )}
    </div>
  )
}

function NarrativeBlock({ narrative }: { narrative: NarrativeData }) {
  return (
    <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        {narrative.source === 'ai' ? (
          <>
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8L12 2Z"
                fill="currentColor"
              />
            </svg>
            Resumen IA
          </>
        ) : (
          'Resumen'
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-800">{narrative.text}</p>
      {narrative.highlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {narrative.highlights.map((h, i) => (
            <span
              key={i}
              className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function DiffStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'rose'
}) {
  const colors =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-rose-200 bg-rose-50 text-rose-700'
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function DiffList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'emerald' | 'rose'
}) {
  const colors =
    tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'
  const symbol = tone === 'emerald' ? '+' : '−'
  return (
    <div className={`rounded-lg border ${colors} p-3`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
        {title}
      </div>
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              className={`font-mono ${tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {symbol}
            </span>
            <span className="text-slate-700">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
