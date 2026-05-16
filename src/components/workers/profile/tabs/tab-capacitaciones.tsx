'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Award,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Play,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * TabCapacitaciones — cursos asignados al trabajador.
 *
 * Consume `/api/workers/[id]/capacitaciones`. Muestra:
 *  - KPIs: completados, en progreso, certificados, obligatorias atrasadas
 *  - Lista de inscripciones agrupada por status
 *  - Cada item linkea al detalle del curso
 */

type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'EXAM_PENDING' | 'PASSED' | 'FAILED'

interface CourseRef {
  id: string
  slug: string
  title: string
  category: string
  durationMin: number
  isObligatory: boolean
  passingScore: number
}

interface EnrollmentItem {
  id: string
  status: EnrollmentStatus
  progress: number
  examScore: number | null
  examAttempts: number
  startedAt: string | null
  completedAt: string | null
  certificateId: string | null
  createdAt: string
  daysSinceCreated: number
  isOverdue: boolean
  course: CourseRef
}

interface CapacitacionesPayload {
  worker: {
    id: string
    firstName: string
    lastName: string
    position: string | null
    regimenLaboral: string
  }
  items: EnrollmentItem[]
  summary: {
    total: number
    completed: number
    inProgress: number
    notStarted: number
    failed: number
    obligatoryOverdue: number
    certificates: number
  }
}

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  NOT_STARTED: 'Sin iniciar',
  IN_PROGRESS: 'En progreso',
  EXAM_PENDING: 'Examen pendiente',
  PASSED: 'Aprobado',
  FAILED: 'No aprobado',
}

const CATEGORY_LABELS: Record<string, string> = {
  SST: 'SST',
  HOSTIGAMIENTO: 'Hostigamiento',
  DERECHOS_LABORALES: 'Derechos laborales',
  CONTRATOS: 'Contratos',
  PLANILLA: 'Planilla',
  INSPECCIONES: 'Inspecciones',
  IGUALDAD: 'Igualdad salarial',
  GENERAL: 'General',
}

interface Props {
  workerId: string
  workerFirstName: string
}

export function TabCapacitaciones({ workerId, workerFirstName }: Props) {
  const [data, setData] = useState<CapacitacionesPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void Promise.resolve().then(() => {
      if (!mounted) return
      setLoading(true)
      fetch(`/api/workers/${workerId}/capacitaciones`)
        .then(async (r) => {
          if (!r.ok) throw new Error(`status ${r.status}`)
          return r.json()
        })
        .then((json: CapacitacionesPayload) => {
          if (!mounted) return
          setData(json)
        })
        .catch((e: Error) => {
          if (!mounted) return
          setError(e.message || 'Error al cargar capacitaciones')
        })
        .finally(() => {
          if (mounted) setLoading(false)
        })
    })
    return () => {
      mounted = false
    }
  }, [workerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-800">No se pudieron cargar las capacitaciones: {error}</p>
      </div>
    )
  }

  if (!data) return null

  const { items, summary } = data
  const overdue = items.filter((i) => i.isOverdue)
  const inProgress = items.filter(
    (i) => (i.status === 'IN_PROGRESS' || i.status === 'EXAM_PENDING') && !i.isOverdue,
  )
  const completed = items.filter((i) => i.status === 'PASSED')
  const notStarted = items.filter(
    (i) => (i.status === 'NOT_STARTED' || i.status === 'FAILED') && !i.isOverdue,
  )

  return (
    <div className="space-y-5 pt-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={CheckCircle2}
          label="Completadas"
          value={summary.completed}
          accent="emerald"
        />
        <Kpi
          icon={Play}
          label="En progreso"
          value={summary.inProgress}
          accent="blue"
        />
        <Kpi
          icon={Award}
          label="Certificados"
          value={summary.certificates}
          accent="amber"
        />
        <Kpi
          icon={AlertTriangle}
          label="Obligatorias atrasadas"
          value={summary.obligatoryOverdue}
          accent={summary.obligatoryOverdue > 0 ? 'red' : 'neutral'}
        />
      </div>

      {/* Banner de obligatorias vencidas */}
      {overdue.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">
                {overdue.length} capacitación{overdue.length !== 1 ? 'es' : ''} obligatoria{overdue.length !== 1 ? 's' : ''} atrasada{overdue.length !== 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-red-800 leading-relaxed">
                {workerFirstName} tiene cursos obligatorios sin completar (más de 30 días desde
                asignación). Esto reduce el score de compliance y puede generar observaciones SUNAFIL.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vacío total */}
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-10 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-[color:var(--text-tertiary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
            Sin capacitaciones asignadas a {workerFirstName}.
          </p>
          <Link
            href="/dashboard/capacitaciones"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
          >
            Ver catálogo de cursos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Listas por estado */}
      {overdue.length > 0 && (
        <Section title="Atrasadas (obligatorias)" items={overdue} accent="red" />
      )}
      {inProgress.length > 0 && (
        <Section title="En progreso" items={inProgress} accent="blue" />
      )}
      {notStarted.length > 0 && (
        <Section title="Sin iniciar" items={notStarted} accent="neutral" />
      )}
      {completed.length > 0 && (
        <Section title="Completadas" items={completed} accent="emerald" />
      )}
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CheckCircle2
  label: string
  value: number
  accent: 'emerald' | 'blue' | 'amber' | 'red' | 'neutral'
}) {
  const accentClass = {
    emerald: 'text-emerald-700 bg-emerald-50',
    blue: 'text-emerald-700 bg-blue-50',
    amber: 'text-amber-700 bg-amber-50',
    red: 'text-red-700 bg-red-50',
    neutral: 'text-[color:var(--text-tertiary)] bg-[color:var(--neutral-50)]',
  }[accent]

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex items-center gap-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', accentClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-[color:var(--text-primary)] tabular-nums">{value}</p>
        <p className="text-[11px] text-[color:var(--text-tertiary)] leading-tight">{label}</p>
      </div>
    </div>
  )
}

function Section({
  title,
  items,
  accent,
}: {
  title: string
  items: EnrollmentItem[]
  accent: 'emerald' | 'blue' | 'amber' | 'red' | 'neutral'
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-2">
        {title} ({items.length})
      </p>
      <div className="space-y-2">
        {items.map((it) => (
          <CourseRow key={it.id} item={it} accent={accent} />
        ))}
      </div>
    </div>
  )
}

function CourseRow({
  item,
  accent,
}: {
  item: EnrollmentItem
  accent: 'emerald' | 'blue' | 'amber' | 'red' | 'neutral'
}) {
  const borderColor = {
    emerald: 'hover:border-emerald-300',
    blue: 'hover:border-blue-300',
    amber: 'hover:border-amber-300',
    red: 'border-red-200 bg-red-50/30 hover:border-red-300',
    neutral: 'hover:border-emerald-300',
  }[accent]

  return (
    <Link
      href={`/dashboard/capacitaciones/${item.course.slug}`}
      className={cn(
        'group block rounded-xl border border-[color:var(--border-default)] bg-white p-3 transition-colors',
        borderColor,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.course.isObligatory && (
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 border border-red-200">
                Obligatoria
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {CATEGORY_LABELS[item.course.category] ?? item.course.category}
            </span>
            <span className="text-[10px] text-[color:var(--text-tertiary)]">
              · {STATUS_LABELS[item.status]}
            </span>
            {item.examScore != null && (
              <span className="text-[10px] text-emerald-700 font-semibold">
                · Puntaje {item.examScore}/100
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-[color:var(--text-primary)] truncate">
            {item.course.title}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.course.durationMin} min
            </span>
            {item.status === 'IN_PROGRESS' && (
              <span>{item.progress}% completado</span>
            )}
            {item.completedAt && (
              <span className="text-emerald-700">
                Completado el {new Date(item.completedAt).toLocaleDateString('es-PE')}
              </span>
            )}
            {item.isOverdue && (
              <span className="text-red-700 font-semibold">
                {item.daysSinceCreated} días desde asignación
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </Link>
  )
}
