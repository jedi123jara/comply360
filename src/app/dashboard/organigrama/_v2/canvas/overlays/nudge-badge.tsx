/**
 * NudgeBadge — Smart Nudges proactivos in-canvas.
 *
 * Floats sobre los nodos visibles con findings críticos del Org Doctor.
 * Limita a 3 nudges visibles a la vez, ranking por severidad.
 *
 * Estado dismissed se persiste en localStorage 7 días por orgId+rule+unitId.
 */
'use client'

import { m, AnimatePresence } from 'framer-motion'
import { AlertCircle, X, ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import type { DoctorFinding } from '@/lib/orgchart/types'

const SEVERITY_BG: Record<DoctorFinding['severity'], string> = {
  CRITICAL: 'border-red-300 bg-red-50',
  HIGH: 'border-amber-300 bg-amber-50',
  MEDIUM: 'border-yellow-300 bg-yellow-50',
  LOW: 'border-sky-300 bg-sky-50',
}

const SEVERITY_TEXT: Record<DoctorFinding['severity'], string> = {
  CRITICAL: 'text-red-700',
  HIGH: 'text-amber-700',
  MEDIUM: 'text-yellow-700',
  LOW: 'text-sky-700',
}

const SEVERITY_RANK: Record<DoctorFinding['severity'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const STORAGE_KEY = 'orgchart-v2:nudge-dismissals'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000 // 7 días
const MAX_VISIBLE = 3

interface DismissalRecord {
  fingerprint: string
  until: number
}

function fingerprintFinding(f: DoctorFinding): string {
  const unitKey = f.affectedUnitIds.slice().sort().join(',')
  return `${f.rule}::${unitKey}`
}

function readDismissals(): DismissalRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as DismissalRecord[]
    const now = Date.now()
    return arr.filter((d) => d.until > now)
  } catch {
    return []
  }
}

function writeDismissals(records: DismissalRecord[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    /* sin acceso a localStorage, no rompemos nada */
  }
}

export interface NudgeBadgeListProps {
  /** Findings que vienen del endpoint /api/orgchart/diagnose. */
  findings: DoctorFinding[]
  /** Callback al click "ver detalle" — abre el inspector con esa unidad. */
  onFocusUnit?: (unitId: string) => void
}

/**
 * Capa flotante (no en el viewport del canvas — es absoluta sobre todo el
 * canvas-area) que muestra los nudges. Se posiciona en la esquina inferior
 * izquierda, no interfiere con minimap/controls.
 */
export function NudgeBadgeList({ findings, onFocusUnit }: NudgeBadgeListProps) {
  // Lazy initial state — el componente vive bajo dynamic({ ssr: false }),
  // así que `window` siempre está disponible en el primer render del cliente.
  const [dismissals, setDismissals] = useState<DismissalRecord[]>(() =>
    typeof window !== 'undefined' ? readDismissals() : [],
  )

  const visibleNudges = useMemo(() => {
    const dismissedSet = new Set(dismissals.map((d) => d.fingerprint))
    const ranked = [...findings]
      .filter((f) => !dismissedSet.has(fingerprintFinding(f)))
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    return ranked.slice(0, MAX_VISIBLE)
  }, [findings, dismissals])

  const handleDismiss = useCallback(
    (f: DoctorFinding) => {
      const fp = fingerprintFinding(f)
      const until = Date.now() + SNOOZE_MS
      const next = [...dismissals, { fingerprint: fp, until }]
      setDismissals(next)
      writeDismissals(next)
    },
    [dismissals],
  )

  if (visibleNudges.length === 0) return null

  return (
    <div className="pointer-events-none absolute bottom-20 left-4 z-20 flex flex-col-reverse gap-2">
      <AnimatePresence>
        {visibleNudges.map((f) => (
          <m.div
            key={fingerprintFinding(f)}
            layout
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border-2 px-3 py-2.5 shadow-lg ${SEVERITY_BG[f.severity]}`}
          >
            <AlertCircle
              className={`mt-0.5 h-4 w-4 flex-shrink-0 ${SEVERITY_TEXT[f.severity]}`}
            />
            <div className="min-w-0 flex-1">
              <div className={`text-[13px] font-semibold ${SEVERITY_TEXT[f.severity]}`}>
                {f.title}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-700">
                {f.description}
              </div>
              {f.baseLegal && (
                <div className="mt-1 font-mono text-[10px] text-slate-500">
                  {f.baseLegal}
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                {f.affectedUnitIds.length > 0 && onFocusUnit && (
                  <button
                    type="button"
                    onClick={() => onFocusUnit(f.affectedUnitIds[0])}
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-700 hover:text-slate-900"
                  >
                    Ver área
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismiss(f)}
                  className="ml-auto text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Aplazar 7 días
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(f)}
              className="flex-shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-white/50 hover:text-slate-700"
              aria-label="Cerrar nudge"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
