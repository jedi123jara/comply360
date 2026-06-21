/**
 * Switcher de layout — segmented control con 4 modos.
 * Atajos de teclado: 1 (vertical), 2 (horizontal), 3 (radial), 4 (disperso).
 */
'use client'

import { Network, MoveRight, CircleDot, LayoutGrid } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useOrgStore } from '../state/org-store'
import type { LayoutMode } from '../state/slices/canvas-slice'

const LAYOUTS: Array<{
  mode: LayoutMode
  label: string
  hint: string
  shortKey: string
  icon: typeof Network
}> = [
  { mode: 'top-down', label: 'Vertical', hint: 'Jerarquía de arriba hacia abajo', shortKey: '1', icon: Network },
  { mode: 'left-right', label: 'Horizontal', hint: 'Jerarquía de izquierda a derecha', shortKey: '2', icon: MoveRight },
  { mode: 'radial', label: 'Radial', hint: 'Disposición circular alrededor de la raíz', shortKey: '3', icon: CircleDot },
  // "grouped-by-area" hoy es vertical con más espaciado (no clustering real),
  // por eso el label honesto es "Disperso" — ver F8 en ORGCHART-V2-MEJORAS.md.
  { mode: 'grouped-by-area', label: 'Disperso', hint: 'Vertical con más espacio entre nodos', shortKey: '4', icon: LayoutGrid },
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
      {LAYOUTS.map(({ mode, label, hint, shortKey, icon: Icon }) => {
        const active = layoutMode === mode
        return (
          <Tooltip key={mode} content={`${hint} · atajo ${shortKey}`}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
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
          </Tooltip>
        )
      })}
    </div>
  )
}
