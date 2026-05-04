/**
 * Switcher de layout — segmented control con 4 modos.
 * Atajos de teclado: 1 (top-down), 2 (LR), 3 (radial), 4 (grouped).
 */
'use client'

import { Network, MoveRight, CircleDot, LayoutGrid } from 'lucide-react'
import { useOrgStore } from '../state/org-store'
import type { LayoutMode } from '../state/slices/canvas-slice'

const LAYOUTS: Array<{
  mode: LayoutMode
  label: string
  shortKey: string
  icon: typeof Network
}> = [
  { mode: 'top-down', label: 'Vertical', shortKey: '1', icon: Network },
  { mode: 'left-right', label: 'Horizontal', shortKey: '2', icon: MoveRight },
  { mode: 'radial', label: 'Radial', shortKey: '3', icon: CircleDot },
  { mode: 'grouped-by-area', label: 'Por área', shortKey: '4', icon: LayoutGrid },
]

export function LayoutSwitcher() {
  const layoutMode = useOrgStore((s) => s.layoutMode)
  const setLayoutMode = useOrgStore((s) => s.setLayoutMode)

  return (
    <div
      role="tablist"
      aria-label="Modo de visualización"
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {LAYOUTS.map(({ mode, label, shortKey, icon: Icon }) => {
        const active = layoutMode === mode
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            title={`${label} · atajo ${shortKey}`}
            onClick={() => setLayoutMode(mode)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
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
