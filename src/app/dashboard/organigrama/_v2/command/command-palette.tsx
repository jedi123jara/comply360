/**
 * Command palette v2 con cmdk.
 *
 * Atajo K (sin modifier) o Cmd/Ctrl+K. Busca:
 *   - Unidades (nombre)
 *   - Cargos (título)
 *   - Personas (nombre, dni)
 *   - Roles legales (CSST, DPO, etc.)
 *   - Comandos (Crear unidad, Crear cargo, Generar memoria, etc.)
 *
 * Al seleccionar un nodo, lo enfoca en el canvas (lo selecciona + abre
 * inspector). Al elegir un comando, lo ejecuta.
 */
'use client'

import { Command } from 'cmdk'
import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Briefcase,
  User,
  ShieldCheck,
  Plus,
  Sparkles,
  History,
  Camera,
  Wand2,
  Search,
} from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'

interface CommandItem {
  id: string
  label: string
  detail?: string
  icon: typeof Building2
  group: 'units' | 'positions' | 'workers' | 'roles' | 'actions'
  onSelect: () => void
}

export function CommandPaletteV2() {
  const open = useOrgStore((s) => s.commandPaletteOpen)
  const setOpen = useOrgStore((s) => s.setCommandPaletteOpen)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const openModal = useOrgStore((s) => s.openModal)
  const setCopilotOpen = useOrgStore((s) => s.setCopilotOpen)
  const setTimemachineOpen = useOrgStore((s) => s.setTimemachineOpen)
  const setDoctorOpen = useOrgStore((s) => s.setDoctorOpen)

  const treeQuery = useTreeQuery(null)
  const tree = treeQuery.data

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = []
    if (!tree) return items

    // Unidades
    for (const u of tree.units) {
      items.push({
        id: `u-${u.id}`,
        label: u.name,
        detail: `Unidad · ${u.kind}`,
        icon: Building2,
        group: 'units',
        onSelect: () => {
          setSelectedUnit(u.id)
          setInspectorOpen(true)
          setOpen(false)
        },
      })
    }

    // Cargos
    for (const p of tree.positions) {
      const unit = tree.units.find((u) => u.id === p.orgUnitId)
      items.push({
        id: `p-${p.id}`,
        label: p.title,
        detail: `Cargo · ${unit?.name ?? '—'}`,
        icon: Briefcase,
        group: 'positions',
        onSelect: () => {
          setSelectedPosition(p.id)
          setSelectedUnit(p.orgUnitId)
          setInspectorOpen(true)
          setOpen(false)
        },
      })
    }

    // Personas (asignaciones)
    for (const a of tree.assignments) {
      const pos = tree.positions.find((p) => p.id === a.positionId)
      const unit = pos ? tree.units.find((u) => u.id === pos.orgUnitId) : null
      items.push({
        id: `w-${a.id}`,
        label: `${a.worker.firstName} ${a.worker.lastName}`,
        detail: `Persona · ${pos?.title ?? '—'}${unit ? ` · ${unit.name}` : ''}`,
        icon: User,
        group: 'workers',
        onSelect: () => {
          if (pos) {
            setSelectedPosition(pos.id)
            setSelectedUnit(pos.orgUnitId)
            setInspectorOpen(true)
          }
          setOpen(false)
        },
      })
    }

    // Roles legales asignados
    for (const r of tree.complianceRoles) {
      const def = COMPLIANCE_ROLES[r.roleType]
      items.push({
        id: `r-${r.id}`,
        label: `${def.label}: ${r.worker.firstName} ${r.worker.lastName}`,
        detail: def.baseLegal,
        icon: ShieldCheck,
        group: 'roles',
        onSelect: () => {
          if (r.unitId) {
            setSelectedUnit(r.unitId)
            setInspectorOpen(true)
          }
          setOpen(false)
        },
      })
    }

    return items
  }, [tree, setSelectedUnit, setSelectedPosition, setInspectorOpen, setOpen])

  const actions: CommandItem[] = useMemo(
    () => [
      {
        id: 'a-create-unit',
        label: 'Nueva unidad',
        detail: 'Crear gerencia, área o equipo',
        icon: Plus,
        group: 'actions',
        onSelect: () => {
          openModal('create-unit')
          setOpen(false)
        },
      },
      {
        id: 'a-create-position',
        label: 'Nuevo cargo',
        detail: 'Definir un cargo en una unidad',
        icon: Briefcase,
        group: 'actions',
        onSelect: () => {
          openModal('create-position')
          setOpen(false)
        },
      },
      {
        id: 'a-assign-worker',
        label: 'Asignar trabajador a cargo',
        icon: User,
        group: 'actions',
        onSelect: () => {
          openModal('assign-worker')
          setOpen(false)
        },
      },
      {
        id: 'a-assign-role',
        label: 'Designar responsable legal',
        detail: 'DPO, CSST, hostigamiento, etc.',
        icon: ShieldCheck,
        group: 'actions',
        onSelect: () => {
          openModal('assign-role')
          setOpen(false)
        },
      },
      {
        id: 'a-copilot',
        label: 'Abrir Copiloto IA',
        detail: 'Cambiar el organigrama con lenguaje natural',
        icon: Sparkles,
        group: 'actions',
        onSelect: () => {
          setCopilotOpen(true)
          setOpen(false)
        },
      },
      {
        id: 'a-doctor',
        label: 'Org Doctor',
        detail: 'Ver hallazgos de cumplimiento',
        icon: ShieldCheck,
        group: 'actions',
        onSelect: () => {
          setDoctorOpen(true)
          setOpen(false)
        },
      },
      {
        id: 'a-timemachine',
        label: 'Time Machine',
        detail: 'Navegar el histórico de snapshots',
        icon: History,
        group: 'actions',
        onSelect: () => {
          setTimemachineOpen(true)
          setOpen(false)
        },
      },
      {
        id: 'a-memoria',
        label: 'Descargar Memoria Anual',
        detail: 'PDF institucional con sello SHA-256',
        icon: Camera,
        group: 'actions',
        onSelect: () => {
          window.open(`/api/orgchart/memoria-anual?year=${new Date().getFullYear()}`, '_blank')
          setOpen(false)
        },
      },
      {
        id: 'a-templates',
        label: 'Plantillas de organigrama',
        icon: Wand2,
        group: 'actions',
        onSelect: () => {
          openModal('templates')
          setOpen(false)
        },
      },
    ],
    [openModal, setOpen, setCopilotOpen, setDoctorOpen, setTimemachineOpen],
  )

  // (cmdk filtra/rankea internamente sobre `value` de cada item; no necesitamos
  // ranking custom. Si quisiéramos rank semántico, podríamos pre-filtrar con
  // buildOrgCommandResults del backend.)

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 p-4 pt-[15vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <Command label="Buscar y comandos" loop>
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <Command.Input
                  placeholder="Buscar unidades, cargos, personas o ejecutar comandos…"
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  autoFocus
                />
                <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                  Esc
                </kbd>
              </div>

              <Command.List className="max-h-[420px] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-xs text-slate-500">
                  Sin resultados.
                </Command.Empty>

                <Command.Group
                  heading="Acciones"
                  className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
                >
                  {actions.map((a) => (
                    <CommandItemRow key={a.id} item={a} />
                  ))}
                </Command.Group>

                {commands.length > 0 && (
                  <>
                    <Command.Group
                      heading="Unidades"
                      className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
                    >
                      {commands.filter((c) => c.group === 'units').map((c) => (
                        <CommandItemRow key={c.id} item={c} />
                      ))}
                    </Command.Group>
                    <Command.Group
                      heading="Cargos"
                      className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
                    >
                      {commands.filter((c) => c.group === 'positions').map((c) => (
                        <CommandItemRow key={c.id} item={c} />
                      ))}
                    </Command.Group>
                    <Command.Group
                      heading="Personas"
                      className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
                    >
                      {commands.filter((c) => c.group === 'workers').map((c) => (
                        <CommandItemRow key={c.id} item={c} />
                      ))}
                    </Command.Group>
                    <Command.Group
                      heading="Roles legales"
                      className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
                    >
                      {commands.filter((c) => c.group === 'roles').map((c) => (
                        <CommandItemRow key={c.id} item={c} />
                      ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
                <span className="flex items-center gap-2">
                  <kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↑</kbd>
                  <kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">↵</kbd>
                  abrir
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="rounded bg-white px-1.5 py-0.5 shadow-sm">K</kbd>
                  toggle
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CommandItemRow({ item }: { item: CommandItem }) {
  const Icon = item.icon
  return (
    <Command.Item
      value={`${item.label} ${item.detail ?? ''}`}
      onSelect={item.onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 aria-selected:bg-emerald-50 aria-selected:text-emerald-900"
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.label}</div>
        {item.detail && (
          <div className="truncate text-[11px] text-slate-500">{item.detail}</div>
        )}
      </div>
    </Command.Item>
  )
}
