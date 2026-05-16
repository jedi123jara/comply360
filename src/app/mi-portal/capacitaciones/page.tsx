'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Award, Clock, CheckCircle2, PlayCircle } from 'lucide-react'
import { PageHeader, EmptyState, ErrorState, Chip, CardGridSkeleton } from '@/components/mi-portal'

interface EnrollmentItem {
  id: string
  courseId: string
  courseTitle: string
  courseCategory: string
  durationMin: number
  status: string
  progress: number
  examScore: number | null
  startedAt: string | null
  completedAt: string | null
  certificateCode: string | null
}

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const STATUS_INFO: Record<string, { label: string; variant: Variant }> = {
  NOT_STARTED: { label: 'Sin iniciar', variant: 'neutral' },
  IN_PROGRESS: { label: 'En curso', variant: 'info' },
  EXAM_PENDING: { label: 'Examen pendiente', variant: 'warning' },
  PASSED: { label: 'Aprobado', variant: 'success' },
  FAILED: { label: 'Reprobado', variant: 'danger' },
}

export default function CapacitacionesPage() {
  const [items, setItems] = useState<EnrollmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mi-portal/capacitaciones', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setItems(d.enrollments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const pendientes = items.filter((i) => i.status !== 'PASSED')
  const completadas = items.filter((i) => i.status === 'PASSED')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis capacitaciones"
        subtitle="Cursos asignados por la empresa. Algunos son obligatorios por ley (Ley 29783, Ley 27942)."
        icon={<GraduationCap className="w-5 h-5" />}
      />

      {loading && <CardGridSkeleton cards={4} />}

      {error && !loading && (
        <ErrorState title="No se pudieron cargar las capacitaciones" message={error} onRetry={load} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title="No tienes capacitaciones asignadas"
          description="Cuando RRHH asigne un curso te va a llegar una notificación acá."
        />
      )}

      {!loading && !error && pendientes.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Pendientes ({pendientes.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendientes.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && completadas.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
            Completadas ({completadas.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completadas.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function CourseCard({ item }: { item: EnrollmentItem }) {
  const status = STATUS_INFO[item.status] ?? STATUS_INFO.NOT_STARTED
  const href =
    item.status === 'PASSED'
      ? `/mi-portal/capacitaciones/${item.id}/certificado`
      : `/mi-portal/capacitaciones/${item.id}`

  return (
    <Link
      href={href}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-sm transition-all block focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-emerald-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase font-bold text-emerald-700 tracking-wide">
            {item.courseCategory}
          </p>
          <h3 className="font-semibold text-slate-900 mt-0.5 leading-tight">{item.courseTitle}</h3>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.durationMin} min
        </span>
        <Chip variant={status.variant}>{status.label}</Chip>
      </div>

      {item.status === 'IN_PROGRESS' && (
        <div className="mb-3">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{item.progress}% completado</p>
        </div>
      )}

      {item.status === 'PASSED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-700 flex-shrink-0" />
          <span className="text-xs text-emerald-900 font-semibold flex-1">
            Ver certificado · Nota {item.examScore}/100
          </span>
          <span className="text-[10px] text-emerald-700">→</span>
        </div>
      )}

      {item.status === 'NOT_STARTED' && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
          <PlayCircle className="w-4 h-4" />
          Iniciar curso
        </div>
      )}

      {item.status === 'EXAM_PENDING' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Rendir examen
        </div>
      )}
    </Link>
  )
}
