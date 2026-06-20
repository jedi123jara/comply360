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
import { UserCircle2, Crown, AlertTriangle, GitBranch, Layers3 } from 'lucide-react'

import { TONE_COLOR_HEX } from '@/lib/orgchart/coverage-aggregator'
import type { PositionNodeData } from '../hooks/use-tree-to-flow'
import { useLOD } from '../hooks/use-lod'
import { PositionNodeToolbar } from '../overlays/node-toolbar'
import { useOrgStore } from '../../state/org-store'

type PositionNodeProps = NodeProps<Node<PositionNodeData>>

const UNIT_KIND_LABELS: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

function PositionNodeInner(props: PositionNodeProps) {
  const { data, selected } = props
  const dimmed = Boolean(data.dimmed)
  const lod = useLOD()
  const tone = data.coverage?.tone ?? 'success'
  const ringColor = TONE_COLOR_HEX[tone]
  const primary = data.occupants[0]
  const statusLabel =
    primary?.status === 'SUSPENDED'
      ? 'Suspendido'
      : primary?.status === 'ON_LEAVE'
        ? 'En licencia'
        : null
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const occupantName = primary
    ? primary.name
    : data.vacant
      ? 'Vacante'
      : '—'
  const unitKindLabel = data.unitKind ? (UNIT_KIND_LABELS[data.unitKind] ?? data.unitKind) : null
  const hierarchyLabel =
    data.hierarchyLevel <= 0 ? 'Nivel ejecutivo' : `Nivel ${data.hierarchyLevel + 1}`

  return (
    <m.div
      layout="position"
      initial={false}
      animate={{ opacity: dimmed ? 0.18 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      style={{ width: 260 }}
      className={`relative overflow-hidden rounded-lg border bg-slate-950 text-slate-100 shadow-[0_18px_45px_rgba(2,6,23,0.28)] transition-shadow hover:shadow-[0_22px_55px_rgba(2,6,23,0.36)] ${
        data.vacant ? 'border-dashed border-slate-500' : 'border-slate-700'
      } ${selected ? 'shadow-[0_0_0_4px_rgba(56,189,248,0.22),0_22px_55px_rgba(2,6,23,0.42)]' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-800/80 to-slate-950" />
      <PositionNodeToolbar nodeId={data.positionId} isVisible={Boolean(selected)} />
      <div
        className="h-1.5 rounded-t-lg"
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
        className="!h-2.5 !w-2.5 !border-0 !bg-slate-300"
      />

      <div className="relative px-3 pt-2.5 pb-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <span
              className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${ringColor}22`, color: ringColor }}
            >
              <Layers3 className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-[10px] font-semibold uppercase text-slate-300">
              {unitKindLabel ?? 'Unidad'}
            </span>
          </div>
          <span className="flex-shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {hierarchyLabel}
          </span>
        </div>

        {data.unitName && (
          <div className="truncate text-[11px] font-medium text-sky-200" title={data.unitPath}>
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
          className={`nodrag nopan mt-1.5 flex w-full items-center gap-2 rounded-md text-left ${
            primary ? 'cursor-pointer' : 'cursor-default'
          }`}
          title={primary ? 'Ver ficha del trabajador' : 'Cargo vacante'}
        >
          {(lod === 'detailed' || lod === 'verbose') && (
            <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-300 ring-1 ring-slate-700">
              <UserCircle2 className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`truncate text-[13px] font-semibold ${
                  data.vacant ? 'text-slate-400 italic' : 'text-white'
                }`}
              >
                {occupantName}
              </span>
              {statusLabel && (
                <span className="flex-shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                  {statusLabel}
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-slate-300">{data.title}</div>
          </div>
          {data.isManagerial && (lod === 'detailed' || lod === 'verbose') && (
            <Crown className="h-4 w-4 flex-shrink-0 text-amber-400" />
          )}
        </button>

        {/* Footer: reportes + score */}
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <GitBranch className="h-3 w-3 flex-shrink-0" />
            {data.directReports} reporte{data.directReports === 1 ? '' : 's'}
            {data.inferredReportsTo && (
              <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-sky-200">
                jerarquía inferida
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            {data.isCritical && (
              <span className="inline-flex items-center gap-0.5 text-amber-300">
                <AlertTriangle className="h-3 w-3" /> crítico
              </span>
            )}
            {data.isUnitLead && !data.isCritical && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-200">
                líder de área
              </span>
            )}
          </span>
        </div>

        {/* Verbose: ocupantes adicionales */}
        {lod === 'verbose' && data.occupants.length > 1 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {data.occupants.slice(1, 4).map((o) => (
              <span
                key={o.workerId}
                className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300"
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
        className="!h-2.5 !w-2.5 !border-0 !bg-slate-300"
      />
    </m.div>
  )
}

PositionNodeInner.displayName = 'PositionNode'

export const PositionNode = memo(PositionNodeInner)
