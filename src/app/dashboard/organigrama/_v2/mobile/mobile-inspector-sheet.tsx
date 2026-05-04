/**
 * Bottom sheet para mostrar el Inspector en mobile.
 *
 * En mobile, el inspector lateral del desktop se transforma en una hoja
 * inferior animada que ocupa hasta 75% del viewport. El usuario la puede
 * cerrar tocando el backdrop o arrastrándola.
 */
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

import type { OrgChartTree } from '@/lib/orgchart/types'
import type { CoverageReport } from '@/lib/orgchart/coverage-aggregator'
import { useOrgStore } from '../state/org-store'
import { InspectorPanel } from '../inspector/inspector-panel'

interface MobileInspectorSheetProps {
  tree: OrgChartTree
  coverage: CoverageReport | null
}

export function MobileInspectorSheet({ tree, coverage }: MobileInspectorSheetProps) {
  const open = useOrgStore((s) => s.inspectorOpen)
  const setOpen = useOrgStore((s) => s.setInspectorOpen)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)

  return (
    <AnimatePresence>
      {open && selectedUnitId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) setOpen(false)
            }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex justify-center pb-1 pt-2">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded p-1 text-slate-500 transition hover:bg-slate-100"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Reusamos el InspectorPanel — su layout interno se adapta a width 100% */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 12px)' }}>
              <div className="[&_aside]:!w-full [&_aside]:!border-l-0">
                <InspectorPanel tree={tree} coverage={coverage} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
