'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Award, Clock, CheckCircle2, PlayCircle } from 'lucide-react'

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

const STATUS_INFO: Record<string, { label: string; class: string }> = {
  NOT_STARTED: { label: 'Sin iniciar', class: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'En curso', class: 'bg-blue-100 text-blue-700' },
  EXAM_PENDING: { label: 'Examen pendiente', class: 'bg-amber-100 text-amber-700' },
  PASSED: { label: 'Aprobado', class: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Reprobado', class: 'bg-red-100 text-red-700' },
}

export default function CapacitacionesPage() {
  const [items, setItems] = useState<EnrollmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-portal/capacitaciones')
      .then((r) => r.json())
      .then((d) => setItems(d.enrollments || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  const pendientes = items.filter((i) => i.status !== 'PASSED')
  const completadas = items.filter((i) => i.status === 'PASSED')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mis Capacitaciones</h2>
        <p className="text-sm text-slate-500 mt-1">
          Cursos asignados por la empresa. Algunos son obligatorios por ley (Ley 29783, Ley 27942).
        </p>
      </div>

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Pendientes ({pendientes.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {pendientes.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Completadas */}
      {completadas.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
            Completadas ({completadas.length})
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {completadas.map((item) => (
              <CourseCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tienes capacitaciones asignadas.</p>
        </div>
      )}
    </div>
  )
}

function CourseCard({ item }: { item: EnrollmentItem }) {
  const status = STATUS_INFO[item.status] || STATUS_INFO.NOT_STARTED

  return (
    <Link
      href={`/mi-portal/capacitaciones/${item.id}`}
      className="bg-[#141824] border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase font-semibold text-purple-700">
            {item.courseCategory}
          </p>
          <h3 className="font-semibold text-slate-900 mt-0.5">{item.courseTitle}</h3>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {item.durationMin} min
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.class}`}>
          {status.label}
        </span>
      </div>

      {item.status === 'IN_PROGRESS' && (
        <div className="mb-3">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{item.progress}% completado</p>
        </div>
      )}

      {item.status === 'PASSED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-green-700" />
          <span className="text-xs text-green-800">
            Certificado obtenido — Nota: {item.examScore}/100
          </span>
        </div>
      )}

      {item.status === 'NOT_STARTED' && (
        <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
          <PlayCircle className="w-4 h-4" />
          Iniciar curso
        </div>
      )}

      {item.status === 'EXAM_PENDING' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Rendir examen
        </div>
      )}
    </Link>
  )
}
