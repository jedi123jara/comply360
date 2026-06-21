'use client'

import { Building2, BriefcaseBusiness } from 'lucide-react'

import { Tooltip } from '@/components/ui/tooltip'
import { useOrgStore } from '../state/org-store'
import type { DisplayMode } from '../state/slices/canvas-slice'

const MODES: Array<{ mode: DisplayMode; label: string; hint: string; icon: typeof Building2 }> = [
  { mode: 'units', label: 'Unidades', hint: 'Ver gerencias y áreas', icon: Building2 },
  { mode: 'positions', label: 'Cargos', hint: 'Ver cargos y trabajadores', icon: BriefcaseBusiness },
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
      {MODES.map(({ mode: itemMode, label, hint, icon: Icon }) => {
        const active = mode === itemMode
        return (
          <Tooltip key={itemMode} content={hint}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
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
          </Tooltip>
        )
      })}
    </div>
  )
}
