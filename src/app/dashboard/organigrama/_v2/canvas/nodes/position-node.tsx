/**
 * Nodo "posición" — representa un cargo individual con su(s) ocupante(s).
 *
 * Diseñado para que en zoom alto se sienta como una "tarjeta" con foto,
 * nombre, área y banda de riesgo.
 */
'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { m } from 'framer-motion'
import { UserCircle2, Crown, AlertTriangle } from 'lucide-react'

import { TONE_COLOR_HEX } from '@/lib/orgchart/coverage-aggregator'
import type { PositionNodeData } from '../hooks/use-tree-to-flow'
import { useLOD } from '../hooks/use-lod'
import { PositionNodeToolbar } from '../overlays/node-toolbar'
import { useOrgStore } from '../../state/org-store'

interface PositionNodeProps extends NodeProps<Node<PositionNodeData>> {
  dimmed?: boolean
}

function PositionNodeInner(props: PositionNodeProps) {
  const { data, selected, dimmed } = props
  const lod = useLOD()
  const tone = data.coverage?.tone ?? 'success'
  const ringColor = TONE_COLOR_HEX[tone]
  const primary = data.occupants[0]
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const occupantName = primary
    ? primary.name
    : data.vacant
      ? 'Vacante'
      : '—'

  return (
    <m.div
      layout="position"
      initial={false}
      animate={{ opacity: dimmed ? 0.18 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      style={{ width: 200 }}
      onClick={() => {
        setSelectedPosition(data.positionId)
        setSelectedUnit(data.unitId)
        setInspectorOpen(true)
      }}
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        data.vacant ? 'border-dashed border-slate-300' : 'border-slate-200'
      } ${selected ? 'shadow-lg' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-50 to-white" />
      <PositionNodeToolbar nodeId={data.positionId} isVisible={Boolean(selected)} />
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: ringColor }}
        aria-hidden
      />

      {selected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl ring-4"
          style={{ boxShadow: `0 0 0 4px ${ringColor}33` }}
          aria-hidden
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-slate-300"
      />

      <div className="relative px-2.5 pt-2 pb-2.5">
        {data.unitName && lod !== 'tiny' && (
          <div className="truncate text-[9px] font-medium uppercase tracking-wide text-slate-400">
            {data.unitName}
          </div>
        )}

        {/* Avatar + nombre */}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            if (!primary) {
              setSelectedPosition(data.positionId)
              setSelectedUnit(data.unitId)
              setInspectorOpen(true)
              return
            }
            setSelectedWorker(primary.workerId)
            setInspectorOpen(true)
          }}
          className={`nodrag nopan mt-1 flex w-full items-center gap-2 rounded-md text-left ${
            primary ? 'cursor-pointer' : 'cursor-default'
          }`}
          title={primary ? 'Ver ficha del trabajador' : 'Cargo vacante'}
        >
          {(lod === 'detailed' || lod === 'verbose') && (
            <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <UserCircle2 className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-[12px] font-medium ${
                data.vacant ? 'text-slate-400 italic' : 'text-slate-900'
              }`}
            >
              {occupantName}
            </div>
            {lod !== 'tiny' && (
              <div className="truncate text-[10px] text-slate-500">{data.title}</div>
            )}
          </div>
          {data.isManagerial && (lod === 'detailed' || lod === 'verbose') && (
            <Crown className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          )}
        </button>

        {/* Footer: reportes + score */}
        {(lod === 'detailed' || lod === 'verbose') && (
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>
              {data.directReports} reporte{data.directReports === 1 ? '' : 's'}
            </span>
            {data.isCritical && (
              <span className="inline-flex items-center gap-0.5 text-amber-700">
                <AlertTriangle className="h-3 w-3" /> crítico
              </span>
            )}
          </div>
        )}

        {/* Verbose: ocupantes adicionales */}
        {lod === 'verbose' && data.occupants.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {data.occupants.slice(1, 4).map((o) => (
              <span
                key={o.workerId}
                className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600"
              >
                {o.name.split(' ')[0]}
                {o.isInterim ? ' (int.)' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-slate-300"
      />
    </m.div>
  )
}

PositionNodeInner.displayName = 'PositionNode'

export const PositionNode = memo(PositionNodeInner)
