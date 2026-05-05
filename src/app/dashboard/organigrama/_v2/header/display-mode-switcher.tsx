'use client'

import { Building2, BriefcaseBusiness } from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import type { DisplayMode } from '../state/slices/canvas-slice'

const MODES: Array<{ mode: DisplayMode; label: string; icon: typeof Building2 }> = [
  { mode: 'units', label: 'Unidades', icon: Building2 },
  { mode: 'positions', label: 'Cargos', icon: BriefcaseBusiness },
]

export function DisplayModeSwitcher() {
  const mode = useOrgStore((s) => s.displayMode)
  const setMode = useOrgStore((s) => s.setDisplayMode)
  const clearSelection = useOrgStore((s) => s.clearSelection)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)

  return (
    <div
      role="tablist"
      aria-label="Nivel de detalle"
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {MODES.map(({ mode: itemMode, label, icon: Icon }) => {
        const active = mode === itemMode
        return (
          <button
            key={itemMode}
            type="button"
            role="tab"
            aria-selected={active}
            title={itemMode === 'positions' ? 'Ver cargos y trabajadores' : 'Ver gerencias y áreas'}
            onClick={() => {
              setMode(itemMode)
              clearSelection()
              setInspectorOpen(false)
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
