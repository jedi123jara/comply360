/**
 * NodeToolbar contextual — mini-toolbar flotante sobre el nodo seleccionado.
 *
 * Estilo Notion: aparece encima del nodo cuando hay selección, con 4 acciones
 * rápidas (Editar, Asignar, Crear cargo hijo, Eliminar).
 *
 * Usa el `<NodeToolbar>` nativo de @xyflow/react que se posiciona
 * automáticamente respecto al nodo.
 */
'use client'

import { NodeToolbar, Position } from '@xyflow/react'
import { Pencil, UserPlus, Plus, Trash2, X, Loader2, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useOrgStore } from '../../state/org-store'
import { treeKey } from '../../data/queries/use-tree'
import { alertsKey } from '../../data/queries/use-alerts'

interface UnitNodeToolbarProps {
  nodeId: string
  unitKind: string
  isVisible: boolean
}

/**
 * Toolbar para nodos de tipo unidad.
 */
export function UnitNodeToolbar({ nodeId, unitKind, isVisible }: UnitNodeToolbarProps) {
  const openModal = useOrgStore((s) => s.openModal)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isLegalUnit = unitKind === 'COMITE_LEGAL' || unitKind === 'BRIGADA'

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true)
      window.setTimeout(() => setConfirming(false), 3500)
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/orgchart/units/${nodeId}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al eliminar')
      }
      toast.success('Unidad desactivada')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
      setSelectedUnit(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <NodeToolbar
      isVisible={isVisible}
      position={Position.Top}
      offset={8}
      className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5"
    >
      <div className="flex items-center gap-0.5">
        <ToolbarBtn
          icon={Pencil}
          title="Ver/editar (inspector)"
          onClick={() => {
            setSelectedUnit(nodeId)
            setInspectorOpen(true)
          }}
        />
        <ToolbarBtn
          icon={Plus}
          title="Nuevo cargo en esta unidad"
          onClick={() => {
            setSelectedUnit(nodeId)
            openModal('create-position', { unitId: nodeId })
          }}
        />
        <ToolbarBtn
          icon={UserPlus}
          title="Asignar trabajador a un cargo de esta unidad"
          onClick={() => {
            setSelectedUnit(nodeId)
            openModal('assign-worker', { unitId: nodeId })
          }}
        />
        {isLegalUnit && (
          <ToolbarBtn
            icon={ShieldCheck}
            title="Designar responsable legal del comité"
            onClick={() => {
              setSelectedUnit(nodeId)
              openModal('assign-role', { unitId: nodeId })
            }}
          />
        )}
        <div className="mx-0.5 h-5 w-px bg-slate-200" />
        <ToolbarBtn
          icon={confirming ? X : Trash2}
          title={confirming ? 'Click otra vez para confirmar' : 'Eliminar unidad'}
          onClick={handleDelete}
          tone={confirming ? 'rose' : 'neutral'}
          loading={deleting}
        />
      </div>
    </NodeToolbar>
  )
}

interface PositionNodeToolbarProps {
  nodeId: string
  isVisible: boolean
}

/**
 * Toolbar para nodos de tipo cargo (positionMode).
 */
export function PositionNodeToolbar({ nodeId, isVisible }: PositionNodeToolbarProps) {
  const openModal = useOrgStore((s) => s.openModal)
  return (
    <NodeToolbar
      isVisible={isVisible}
      position={Position.Top}
      offset={8}
      className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5"
    >
      <div className="flex items-center gap-0.5">
        <ToolbarBtn
          icon={Pencil}
          title="Editar cargo"
          onClick={() => openModal('edit-position', { positionId: nodeId })}
        />
        <ToolbarBtn
          icon={UserPlus}
          title="Asignar trabajador"
          onClick={() => openModal('assign-worker', { positionId: nodeId })}
        />
      </div>
    </NodeToolbar>
  )
}

function ToolbarBtn({
  icon: Icon,
  title,
  onClick,
  tone = 'neutral',
  loading = false,
}: {
  icon: LucideIcon
  title: string
  onClick: () => void
  tone?: 'neutral' | 'rose'
  loading?: boolean
}) {
  const colors =
    tone === 'rose'
      ? 'text-rose-600 hover:bg-rose-50'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded transition ${colors}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
    </button>
  )
}
