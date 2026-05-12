/**
 * Nodo "unidad" — representa una OrgUnit (gerencia, área, equipo, comité).
 *
 * Aplica LOD según zoom: en zoom bajo solo cuadro + nombre, en zoom alto
 * suma posiciones, ocupantes, score y ring de coverage.
 *
 * El color del borde refleja el `tone` del Compliance Heatmap.
 */
'use client'

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { m } from 'framer-motion'
import {
  Building2,
  Users,
  ShieldAlert,
  AlertTriangle,
  UsersRound,
  BriefcaseBusiness,
  ShieldCheck,
  Landmark,
} from 'lucide-react'

import {
  TONE_COLOR_HEX,
  TONE_LABEL,
  type UnitCoverage,
} from '@/lib/orgchart/coverage-aggregator'
import type { UnitNodeData } from '../hooks/use-tree-to-flow'
import { useLOD } from '../hooks/use-lod'
import { UnitNodeToolbar } from '../overlays/node-toolbar'

const KIND_LABELS: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité legal',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

const KIND_ICON_BG: Record<string, string> = {
  GERENCIA: 'bg-emerald-100 text-emerald-700',
  AREA: 'bg-sky-100 text-sky-700',
  DEPARTAMENTO: 'bg-slate-100 text-slate-700',
  EQUIPO: 'bg-indigo-100 text-indigo-700',
  COMITE_LEGAL: 'bg-sky-100 text-sky-800',
  BRIGADA: 'bg-amber-100 text-amber-700',
  PROYECTO: 'bg-cyan-100 text-cyan-700',
}

const KIND_ICON: Record<string, typeof Building2> = {
  GERENCIA: Landmark,
  AREA: Building2,
  DEPARTAMENTO: Building2,
  EQUIPO: UsersRound,
  COMITE_LEGAL: ShieldCheck,
  BRIGADA: ShieldAlert,
  PROYECTO: BriefcaseBusiness,
}

interface UnitNodeProps extends NodeProps<Node<UnitNodeData>> {
  /** Si está en true (focus mode), este nodo debe dimearse. */
  dimmed?: boolean
}

function UnitNodeInner(props: UnitNodeProps) {
  const { data, selected, dimmed } = props
  const lod = useLOD()
  const tone = data.coverage?.tone ?? 'success'
  const ringColor = TONE_COLOR_HEX[tone]
  const Icon = KIND_ICON[data.unitKind] ?? Building2

  return (
    <m.div
      layout="position"
      initial={data.ghost ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: dimmed ? 0.18 : data.ghost ? 0.7 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      style={{ width: 240 }}
      className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-lg ${
        selected ? 'shadow-xl' : ''
      } ${data.ghost ? 'border-dashed border-emerald-400 bg-emerald-50/40' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-50 to-white" />
      <UnitNodeToolbar
        nodeId={data.unitId}
        unitKind={data.unitKind}
        isVisible={Boolean(selected)}
      />
      {/* Borde superior coloreado por compliance tone */}
      <div
        className="h-1.5 rounded-t-xl"
        style={{ backgroundColor: ringColor }}
        aria-hidden
      />

      {/* Selección: ring del color del tono */}
      {selected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl ring-4"
          style={{ boxShadow: `0 0 0 4px ${ringColor}33` }}
          aria-hidden
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-slate-300"
      />

      <div className="relative px-3 pt-2 pb-3">
        {/* Header: kind + name */}
        <div className="flex items-center gap-2">
          <span
          className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md ${
              KIND_ICON_BG[data.unitKind] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {KIND_LABELS[data.unitKind] ?? data.unitKind}
            </div>
            {lod !== 'tiny' && (
              <div className="truncate text-sm font-semibold text-slate-900">
                {data.name}
              </div>
            )}
            {lod === 'tiny' && (
              <div className="truncate text-[11px] font-medium text-slate-700">
                {data.name}
              </div>
            )}
          </div>
        </div>

        {/* Detalle (compact+) */}
        {(lod === 'detailed' || lod === 'verbose') && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {data.occupantsCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              {data.positionsCount} cargo{data.positionsCount === 1 ? '' : 's'}
            </span>
            {data.coverage && data.coverage.findingCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {data.coverage.findingCount}
              </span>
            )}
          </div>
        )}

        {/* Banda de coverage (siempre, incluso en tiny) */}
        {data.coverage && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${data.coverage.score}%`,
                  backgroundColor: ringColor,
                }}
              />
            </div>
            {(lod === 'detailed' || lod === 'verbose') && (
              <span
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: ringColor }}
              >
                {data.coverage.score}
              </span>
            )}
          </div>
        )}

        {/* Verbose: badge del tono */}
        {lod === 'verbose' && data.coverage && (
          <div className="mt-2 flex items-center justify-between">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${ringColor}1a`,
                color: ringColor,
              }}
            >
              {TONE_LABEL[data.coverage.tone]}
            </span>
            {data.coverage.findingCount > 0 && (
              <span className="text-[10px] text-slate-500">
                {data.coverage.findingCount} hallazgo
                {data.coverage.findingCount === 1 ? '' : 's'}
              </span>
            )}
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

UnitNodeInner.displayName = 'UnitNode'

export const UnitNode = memo(UnitNodeInner)

// Helper para tipado fuerte cuando se pasa coverage al inicializar
export function tonifyUnitNode(
  base: UnitNodeData,
  coverage: UnitCoverage | null,
): UnitNodeData {
  return { ...base, coverage }
}
