'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CircleDashed, ListChecks, Loader2, PlayCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'

type DelegatedTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

interface DelegatedTask {
  id: string
  assigneeWorkerId: string
  sourcePositionId: string | null
  title: string
  description: string | null
  dueAt: string | null
  status: DelegatedTaskStatus
  evidenceUrl: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_LABEL: Record<DelegatedTaskStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En curso',
  DONE: 'Cerrada',
  CANCELLED: 'Cancelada',
}

const STATUS_TONE: Record<DelegatedTaskStatus, string> = {
  OPEN: 'border-amber-200 bg-amber-50 text-amber-800',
  IN_PROGRESS: 'border-sky-200 bg-sky-50 text-sky-800',
  DONE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
}

const tasksKey = ['orgchart', 'delegated-tasks'] as const

export function DelegatedTasksModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)
  const open = activeModal === 'delegated-tasks'
  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeWorkerId, setAssigneeWorkerId] = useState('')
  const [sourcePositionId, setSourcePositionId] = useState(selectedPositionId ?? '')
  const [dueAt, setDueAt] = useState('')

  const tasksQuery = useQuery({
    queryKey: tasksKey,
    enabled: open,
    queryFn: async (): Promise<DelegatedTask[]> => {
      const res = await fetch('/api/orgchart/delegated-tasks', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as { tasks: DelegatedTask[] }
      return data.tasks
    },
  })

  const workers = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>()
    for (const assignment of treeQuery.data?.assignments ?? []) {
      const worker = assignment.worker
      byId.set(worker.id, {
        id: worker.id,
        label: `${worker.lastName}, ${worker.firstName}`,
      })
    }
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [treeQuery.data])

  const positionsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const position of treeQuery.data?.positions ?? []) {
      map.set(position.id, position.title)
    }
    return map
  }, [treeQuery.data])

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/orgchart/delegated-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          assigneeWorkerId,
          sourcePositionId: sourcePositionId || null,
          dueAt: dueAt || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'No se pudo crear la tarea')
      }
    },
    onSuccess: async () => {
      setTitle('')
      setDescription('')
      setDueAt('')
      await queryClient.invalidateQueries({ queryKey: tasksKey })
      toast.success('Tarea delegada creada')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la tarea')
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DelegatedTaskStatus }) => {
      const res = await fetch(`/api/orgchart/delegated-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'No se pudo actualizar la tarea')
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar la tarea')
    },
  })

  const canCreate = title.trim().length > 0 && assigneeWorkerId.length > 0 && !createTask.isPending

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Tareas delegadas"
      subtitle="Responsables, vencimientos y evidencias vinculadas al organigrama"
      icon={<ListChecks className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-2">
          {tasksQuery.isLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando tareas...
            </div>
          ) : (tasksQuery.data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              No hay tareas delegadas activas.
            </div>
          ) : (
            tasksQuery.data?.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                assignee={workers.find((worker) => worker.id === task.assigneeWorkerId)?.label ?? task.assigneeWorkerId}
                position={task.sourcePositionId ? positionsById.get(task.sourcePositionId) ?? null : null}
                onStatus={(status) => updateStatus.mutate({ id: task.id, status })}
                busy={updateStatus.isPending}
              />
            ))
          )}
        </section>

        <form
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (canCreate) createTask.mutate()
          }}
        >
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Título
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Responsable
            </label>
            <select
              value={assigneeWorkerId}
              onChange={(event) => setAssigneeWorkerId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            >
              <option value="">Seleccionar</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Cargo origen
            </label>
            <select
              value={sourcePositionId}
              onChange={(event) => setSourcePositionId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            >
              <option value="">Sin cargo</option>
              {treeQuery.data?.positions.map((position) => (
                <option key={position.id} value={position.id}>{position.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Vence
            </label>
            <input
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Detalle
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            disabled={!canCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {createTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear tarea
          </button>
        </form>
      </div>
    </ModalShell>
  )
}

function TaskRow({
  assignee,
  busy,
  onStatus,
  position,
  task,
}: {
  assignee: string
  busy: boolean
  onStatus: (status: DelegatedTaskStatus) => void
  position: string | null
  task: DelegatedTask
}) {
  const due = task.dueAt ? new Date(task.dueAt) : null

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{task.title}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONE[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {assignee}
            {position ? ` · ${position}` : ''}
          </p>
          {task.description && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{task.description}</p>
          )}
          {due && (
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Vence: {due.toLocaleDateString('es-PE')}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <IconAction
            label="Abrir"
            disabled={busy || task.status === 'OPEN'}
            onClick={() => onStatus('OPEN')}
            icon={<CircleDashed className="h-4 w-4" />}
          />
          <IconAction
            label="En curso"
            disabled={busy || task.status === 'IN_PROGRESS'}
            onClick={() => onStatus('IN_PROGRESS')}
            icon={<PlayCircle className="h-4 w-4" />}
          />
          <IconAction
            label="Cerrar"
            disabled={busy || task.status === 'DONE'}
            onClick={() => onStatus('DONE')}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <IconAction
            label="Cancelar"
            disabled={busy || task.status === 'CANCELLED'}
            onClick={() => onStatus('CANCELLED')}
            icon={<XCircle className="h-4 w-4" />}
          />
        </div>
      </div>
    </article>
  )
}

function IconAction({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  )
}
