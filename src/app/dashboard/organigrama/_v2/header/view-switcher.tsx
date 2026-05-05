'use client'

import { Building2, UsersRound } from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import type { View } from '../state/slices/canvas-slice'

const VIEWS: Array<{ view: View; label: string; icon: typeof Building2 }> = [
  { view: 'hierarchy', label: 'Empresa', icon: Building2 },
  { view: 'committees', label: 'Comisiones', icon: UsersRound },
]

export function ViewSwitcher() {
  const view = useOrgStore((s) => s.view)
  const setView = useOrgStore((s) => s.setView)
  const clearSelection = useOrgStore((s) => s.clearSelection)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)

  return (
    <div
      role="tablist"
      aria-label="Tipo de organigrama"
      className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      {VIEWS.map(({ view: itemView, label, icon: Icon }) => {
        const active = view === itemView
        return (
          <button
            key={itemView}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setView(itemView)
              clearSelection()
              setInspectorOpen(false)
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
