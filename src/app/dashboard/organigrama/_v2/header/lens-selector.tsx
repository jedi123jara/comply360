/**
 * Selector de lente — combo elegante (vs. los 6 botones de la v1).
 *
 * En v2 el "Compliance Heatmap" es la vista por defecto (siempre activa);
 * las lentes adicionales (mof, contractual, sst, vacancies) se aplican
 * sobre los chips/badges de los nodos cuando el zoom es alto.
 */
'use client'

import { Eye, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useOrgStore } from '../state/org-store'
import type { OrgLens } from '../state/slices/canvas-slice'

const LENS_LABEL: Record<OrgLens, string> = {
  general: 'General',
  mof: 'MOF',
  compliance: 'Cumplimiento',
  contractual: 'Contratos',
  sst: 'SST',
  vacancies: 'Vacantes',
}

const LENSES: OrgLens[] = ['general', 'mof', 'compliance', 'contractual', 'sst', 'vacancies']

export function LensSelector() {
  const lens = useOrgStore((s) => s.lens)
  const setLens = useOrgStore((s) => s.setLens)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Eye className="h-4 w-4" />
        <span className="hidden md:inline">Lente: {LENS_LABEL[lens]}</span>
        <span className="md:hidden">{LENS_LABEL[lens]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[160px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {LENSES.map((l) => (
            <button
              key={l}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setLens(l)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50 ${
                l === lens ? 'font-semibold text-emerald-700' : 'text-slate-700'
              }`}
            >
              {LENS_LABEL[l]}
              {l === lens && <span className="text-[10px] text-emerald-600">activa</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
