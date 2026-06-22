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
  UserX,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

import {
  TONE_COLOR_HEX,
  type UnitCoverage,
} from '@/lib/orgchart/coverage-aggregator'
import type { UnitNodeData } from '../hooks/use-tree-to-flow'
import { OrgAvatar } from '../../shared/org-avatar'
import { useLOD } from '../hooks/use-lod'
import { UnitNodeToolbar } from '../overlays/node-toolbar'
import { useOrgStore } from '../../state/org-store'

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

type UnitNodeProps = NodeProps<Node<UnitNodeData>>

function UnitNodeInner(props: UnitNodeProps) {
  const { data, selected } = props
  const dimmed = Boolean(data.dimmed)
  const lod = useLOD()
  const toggleCollapsed = useOrgStore((s) => s.toggleCollapsed)
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
      style={{ width: 280 }}
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggleCollapsed(data.unitId)
        }}
        title={data.collapsed ? 'Desplegar rama' : 'Plegar rama'}
        className={`nodrag nopan absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50 ${
          data.collapsed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {data.collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {data.collapsed && data.hiddenCount ? <span>{data.hiddenCount}</span> : null}
      </button>
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

      <div className="relative px-3 pt-2.5 pb-3">
        {/* Header: kind + nombre + score */}
        <div className="flex items-start gap-2">
          <span
            className={`relative inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
              KIND_ICON_BG[data.unitKind] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {KIND_LABELS[data.unitKind] ?? data.unitKind}
            </div>
            <div className="truncate text-sm font-semibold text-slate-900">{data.name}</div>
          </div>
          {data.coverage && (
            <span
              className="flex-shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
              style={{ backgroundColor: `${ringColor}1a`, color: ringColor }}
              title={`Cumplimiento ${data.coverage.score}/100`}
            >
              {data.coverage.score}
            </span>
          )}
        </div>

        {/* Responsable de la unidad */}
        {lod !== 'tiny' && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
            {data.responsable ? (
              <>
                <OrgAvatar
                  name={data.responsable.name}
                  photoUrl={data.responsable.photoUrl}
                  gender={data.responsable.gender}
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-semibold text-slate-800">
                    {data.responsable.name}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {data.responsable.title}
                    {data.responsable.interim ? ' · interino' : ''}
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                  <UserX className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] text-slate-400">Sin responsable asignado</span>
              </>
            )}
          </div>
        )}

        {/* Lista de cargos */}
        {(lod === 'detailed' || lod === 'verbose') && data.cargos && data.cargos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {data.cargos.slice(0, 4).map((c) => (
              <li key={c.positionId} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    c.vacant ? 'bg-slate-300' : 'bg-emerald-500'
                  }`}
                  aria-hidden
                />
                <span className="truncate text-slate-700">{c.title}</span>
                {c.isCritical && (
                  <ShieldAlert className="h-3 w-3 flex-shrink-0 text-amber-600" />
                )}
                <span
                  className={`ml-auto flex-shrink-0 max-w-[96px] truncate text-[10px] ${
                    c.vacant ? 'font-medium text-amber-700' : 'text-slate-400'
                  }`}
                >
                  {c.vacant ? 'Vacante' : c.occupantName}
                </span>
              </li>
            ))}
            {data.cargos.length > 4 && (
              <li className="text-[10px] text-slate-400">
                +{data.cargos.length - 4} cargo{data.cargos.length - 4 === 1 ? '' : 's'} más
              </li>
            )}
          </ul>
        )}

        {/* KPIs */}
        {lod !== 'tiny' && (
          <div className="mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              {data.positionsCount} cargo{data.positionsCount === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {data.occupantsCount}
            </span>
            {data.vacantesCount != null && data.vacantesCount > 0 && (
              <span className="font-medium text-amber-700">{data.vacantesCount} vac.</span>
            )}
            {data.coverage && data.coverage.findingCount > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 text-rose-600">
                <AlertTriangle className="h-3 w-3" />
                {data.coverage.findingCount}
              </span>
            )}
          </div>
        )}

        {/* Barra de cumplimiento */}
        {data.coverage && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${data.coverage.score}%`, backgroundColor: ringColor }}
            />
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
