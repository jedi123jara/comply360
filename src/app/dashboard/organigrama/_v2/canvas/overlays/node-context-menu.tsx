/**
 * Menú contextual (clic derecho) sobre un nodo del organigrama, con verbos de
 * RRHH desde donde el usuario está mirando. Las acciones simples (asignar,
 * editar, designar) abren modales; las acciones profundas de ciclo de vida
 * (promover / cesar / cambiar sueldo) navegan al perfil del trabajador, donde
 * viven esos flujos — que ya están sincronizados con el organigrama.
 */
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Node } from '@xyflow/react'
import {
  Pencil,
  UserPlus,
  ShieldCheck,
  Eye,
  ArrowUpRight,
  Plus,
  PauseCircle,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useOrgStore } from '../../state/org-store'
import { treeKey } from '../../data/queries/use-tree'
import type { PositionNodeData, UnitNodeData } from '../hooks/use-tree-to-flow'

export interface CtxMenuState {
  x: number
  y: number
  node: Node
}

interface MenuItem {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function NodeContextMenu({
  state,
  onClose,
}: {
  state: CtxMenuState
  onClose: () => void
}) {
  const router = useRouter()
  const openModal = useOrgStore((s) => s.openModal)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const queryClient = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const { node } = state
  const applyChange = async (workerId: string, change: { kind: 'suspend' | 'reactivate' }) => {
    try {
      const res = await fetch('/api/orgchart/worker-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, change }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'No se pudo aplicar el cambio')
      }
      toast.success(change.kind === 'suspend' ? 'Trabajador suspendido' : 'Trabajador reactivado')
      await queryClient.invalidateQueries({ queryKey: treeKey(null) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const items: MenuItem[] = []

  if (node.type === 'positionNode') {
    const data = node.data as PositionNodeData
    const occupant = data.occupants[0]
    const positionId = data.positionId
    items.push({
      icon: Pencil,
      label: 'Editar cargo',
      onClick: () => openModal('edit-position', { positionId }),
    })
    if (occupant) {
      items.push({
        icon: Eye,
        label: 'Ver ficha del trabajador',
        onClick: () => {
          setSelectedWorker(occupant.workerId)
          setInspectorOpen(true)
        },
      })
      items.push({
        icon: ArrowUpRight,
        label: 'Gestionar trabajador (promover · cesar · sueldo)',
        onClick: () => router.push(`/dashboard/trabajadores/${occupant.workerId}`),
      })
      if (occupant.status === 'SUSPENDED') {
        items.push({
          icon: PlayCircle,
          label: 'Reactivar al trabajador',
          onClick: () => applyChange(occupant.workerId, { kind: 'reactivate' }),
        })
      } else {
        items.push({
          icon: PauseCircle,
          label: 'Suspender al trabajador',
          onClick: () => applyChange(occupant.workerId, { kind: 'suspend' }),
        })
      }
    } else {
      items.push({
        icon: UserPlus,
        label: 'Asignar trabajador',
        onClick: () => openModal('assign-worker', { positionId }),
      })
    }
    items.push({
      icon: ShieldCheck,
      label: 'Designar responsable legal',
      onClick: () => openModal('assign-role', { positionId }),
    })
  } else {
    const data = node.data as UnitNodeData
    const unitId = data.unitId
    items.push({
      icon: Eye,
      label: 'Ver / editar área',
      onClick: () => {
        setSelectedUnit(unitId)
        setInspectorOpen(true)
      },
    })
    items.push({
      icon: Plus,
      label: 'Nuevo cargo aquí',
      onClick: () => openModal('create-position', { unitId }),
    })
    items.push({
      icon: UserPlus,
      label: 'Asignar trabajador',
      onClick: () => openModal('assign-worker', { unitId }),
    })
    items.push({
      icon: ShieldCheck,
      label: 'Designar responsable legal',
      onClick: () => openModal('assign-role', { unitId }),
    })
  }

  // Mantener el menú dentro del viewport (evita que se corte en el borde derecho/inferior).
  const left = Math.min(state.x, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 260)
  const top = Math.min(state.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 12 - items.length * 38)

  return (
    <div
      ref={ref}
      style={{ left, top }}
      className="fixed z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl ring-1 ring-black/5"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.onClick()
              onClose()
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
          >
            <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
