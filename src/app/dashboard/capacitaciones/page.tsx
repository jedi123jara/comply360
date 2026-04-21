'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  GraduationCap, BookOpen, Award, Users, Clock, ChevronRight,
  Loader2, AlertTriangle, Shield, Scale, HardHat,
  FileText, BarChart3, Zap, Search, SlidersHorizontal, Flame,
  Star, Trophy, Target, Play, Eye,
  ChevronDown, X, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CourseLesson {
  id: string
  title: string
  durationMin: number
  contentType: string
}

interface CourseData {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  durationMin: number
  isObligatory: boolean
  passingScore: number
  lessons: CourseLesson[]
  _count: { examQuestions: number; enrollments: number }
  stats: {
    totalEnrolled: number
    passed: number
    inProgress: number
    notStarted: number
    completionRate: number
  }
  difficulty?: 'BASICO' | 'INTERMEDIO' | 'AVANZADO'
  isNew?: boolean
  createdAt?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof GraduationCap; color: string; bg: string; border: string }> = {
  SST:                { label: 'Seguridad y Salud', icon: HardHat,       color: 'text-amber-400',   bg: 'bg-amber-900/30',   border: 'border-amber-800' },
  HOSTIGAMIENTO:      { label: 'Hostigamiento',     icon: Shield,        color: 'text-red-400',       bg: 'bg-red-900/30',       border: 'border-red-800' },
  DERECHOS_LABORALES: { label: 'Derechos',          icon: Scale,         color: 'text-emerald-600',     bg: 'bg-blue-900/30',     border: 'border-blue-800' },
  CONTRATOS:          { label: 'Contratos',         icon: FileText,      color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-800' },
  PLANILLA:           { label: 'Planilla',          icon: BarChart3,     color: 'text-emerald-600', bg: 'bg-emerald-900/30', border: 'border-emerald-800' },
  INSPECCIONES:       { label: 'Inspecciones',      icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-800' },
  IGUALDAD:           { label: 'Igualdad Salarial', icon: Users,         color: 'text-pink-400',     bg: 'bg-pink-900/30',     border: 'border-pink-800' },
  GENERAL:            { label: 'General',           icon: BookOpen,      color: 'text-[color:var(--text-tertiary)]',     bg: 'bg-[color:var(--neutral-50)] bg-gray-700',        border: 'border-[color:var(--border-default)] border-gray-600' },
}

const DIFFICULTY_CONFIG = {
  BASICO:      { label: 'Básico',       color: 'text-green-400',  bg: 'bg-green-900/30' },
  INTERMEDIO:  { label: 'Intermedio',   color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
  AVANZADO:    { label: 'Avanzado',     color: 'text-red-400',      bg: 'bg-red-900/30' },
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── Progress Ring ───────────────────────────────────────────────────────────
function ProgressRing({ value, max, size = 80, stroke = 7, color = '#6366f1' }: {
  value: number; max: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? value / max : 0
  const dash = circ * pct
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke}
        className="text-slate-700" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

// ─── Course Card ─────────────────────────────────────────────────────────────
function CourseCard({ course, userProgress }: { course: CourseData; userProgress?: number }) {
  const catConfig = CATEGORY_CONFIG[course.category] || CATEGORY_CONFIG.GENERAL
  const CatIcon = catConfig.icon
  const diff = course.difficulty ? DIFFICULTY_CONFIG[course.difficulty] : DIFFICULTY_CONFIG.BASICO
  const enrolled = course.stats.totalEnrolled
  const pct = userProgress ?? 0
  const isCompleted = pct === 100
  const isStarted = pct > 0

  return (
    <Link
      href={`/dashboard/capacitaciones/${course.id}`}
      className="group relative flex flex-col rounded-xl border border-[color:var(--border-default)] bg-white shadow-sm
                 transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 overflow-hidden"
    >
      {/* Top color band */}
      <div className={cn('h-1.5 w-full', catConfig.bg.replace('bg-', 'bg-').split(' ')[0])}
           style={{ background: `var(--cat-color, currentColor)` }}>
        <div className={cn('h-full w-full', catConfig.color.replace('text-', 'bg-').split(' ')[0])} />
      </div>

      {/* Thumbnail area */}
      <div className={cn('flex h-24 items-center justify-center', catConfig.bg)}>
        <CatIcon className={cn('h-12 w-12 opacity-60', catConfig.color)} />
      </div>

      {/* Badges row */}
      <div className="absolute top-10 left-3 flex flex-wrap gap-1">
        {course.isNew && (
          <span className="flex items-center gap-0.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Sparkles className="h-2.5 w-2.5" /> Nuevo
          </span>
        )}
        {course.isObligatory && (
          <span className="flex items-center gap-0.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <AlertTriangle className="h-2.5 w-2.5" /> Obligatorio
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3 gap-2">
        {/* Category + Difficulty */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', catConfig.bg, catConfig.color)}>
            {catConfig.label}
          </span>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', diff.bg, diff.color)}>
            {diff.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-white text-[color:var(--text-emerald-700)] group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[color:var(--text-tertiary)] line-clamp-2 leading-relaxed flex-1">
          {course.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-[color:var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{formatDuration(course.durationMin)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />{course.lessons.length} lec.
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />{course._count.examQuestions} preg.
          </span>
        </div>

        {/* Enrolled count */}
        {enrolled > 0 && (
          <p className="text-[10px] text-[color:var(--text-tertiary)] flex items-center gap-1">
            <Users className="h-3 w-3" />
            {enrolled.toLocaleString('es-PE')} trabajador{enrolled !== 1 ? 'es' : ''} completaron
          </p>
        )}

        {/* Progress bar (enrolled user) */}
        {isStarted || isCompleted ? (
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[color:var(--text-tertiary)]">
                {isCompleted ? 'Completado' : 'En progreso'}
              </span>
              <span className={cn('font-semibold', isCompleted ? 'text-green-400' : 'text-emerald-700')}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[color:var(--neutral-100)]">
              <div
                className={cn('h-1.5 rounded-full transition-all', isCompleted ? 'bg-green-500' : 'bg-emerald-600')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[color:var(--text-tertiary)]">
                Tasa de aprobación del catalogo
              </span>
              <span className="font-medium text-[color:var(--text-tertiary)]">{course.stats.completionRate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[color:var(--neutral-100)]">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  course.stats.completionRate >= 80 ? 'bg-green-500' :
                  course.stats.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${course.stats.completionRate}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA button */}
        <div className="pt-1">
          <div className={cn(
            'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
            isCompleted
              ? 'bg-green-900/20 text-green-400'
              : isStarted
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-emerald-600 text-white group-hover:bg-emerald-600/90'
          )}>
            {isCompleted ? (
              <><Eye className="h-3.5 w-3.5" /> Revisar Curso</>
            ) : isStarted ? (
              <><Play className="h-3.5 w-3.5" /> Continuar</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> Iniciar Curso</>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CapacitacionesPage() {
  const [courses, setCourses] = useState<CourseData[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('obligatorio')
  const [showFilters, setShowFilters] = useState(false)

  async function loadCourses() {
    try {
      const res = await fetch('/api/courses')
      const data = await res.json()
      // Enrich with synthetic difficulty + isNew for demo
      const enriched: CourseData[] = (data.courses || []).map((c: CourseData, i: number) => ({
        ...c,
        difficulty: (['BASICO', 'INTERMEDIO', 'AVANZADO'] as const)[i % 3],
        isNew: i < 2,
      }))
      setCourses(enriched)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCourses() }, [])

  async function handleSeed() {
    setSeeding(true)
    try {
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      loadCourses()
    } catch { /* ignore */ }
    finally { setSeeding(false) }
  }

  // ── Gamification stats (simulated for demo) ──────────────────────────────
  const completedCourses = Math.floor(courses.length * 0.3)
  const hoursThisMonth = Math.round(courses.reduce((s, c) => s + c.durationMin, 0) * 0.4 / 60)
  const certificatesEarned = Math.floor(completedCourses * 0.8)
  const streak = 7

  // ── Global catalog stats ─────────────────────────────────────────────────
  const globalStats = {
    totalCourses: courses.length,
    obligatoryCourses: courses.filter(c => c.isObligatory).length,
    totalEnrolled: courses.reduce((s, c) => s + c.stats.totalEnrolled, 0),
    totalPassed: courses.reduce((s, c) => s + c.stats.passed, 0),
    avgCompletionRate: courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + c.stats.completionRate, 0) / courses.length)
      : 0,
  }

  // ── Featured course ───────────────────────────────────────────────────────
  const featuredCourse = courses.find(c => c.category === 'SST' && c.isObligatory) || courses[0]

  // ── Obligatory pending ────────────────────────────────────────────────────
  const obligatoryPending = courses.filter(c => c.isObligatory)

  // ── Next recommended ─────────────────────────────────────────────────────
  const nextRecommended = courses.find(c => !c.isObligatory) || courses[1]

  // ── Filtered + sorted courses ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...courses]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      )
    }
    if (categoryFilter) list = list.filter(c => c.category === categoryFilter)
    if (diffFilter)     list = list.filter(c => c.difficulty === diffFilter)
    // status filter: simulated (0% = not started, 1-99% = in progress, 100% = completed)
    // For demo we skip real user progress

    if (sortBy === 'obligatorio') {
      list = list.sort((a, b) => (b.isObligatory ? 1 : 0) - (a.isObligatory ? 1 : 0))
    } else if (sortBy === 'popular') {
      list = list.sort((a, b) => b.stats.totalEnrolled - a.stats.totalEnrolled)
    } else if (sortBy === 'reciente') {
      list = list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
    }

    return list
  }, [courses, search, categoryFilter, diffFilter, sortBy])

  const activeFilterCount = [categoryFilter, diffFilter, statusFilter].filter(Boolean).length

  return (
    <div className="space-y-7">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white text-[color:var(--text-emerald-700)]">Capacitaciones</h1>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
            Cursos obligatorios y de desarrollo para cumplimiento normativo (Ley 29783, Ley 27942)
          </p>
        </div>
        {courses.length === 0 && !loading && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600/90 disabled:opacity-50"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {seeding ? 'Cargando...' : 'Cargar Catálogo'}
          </button>
        )}
      </div>

      {/* ── Learning Dashboard ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Progress ring */}
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex items-center gap-4">
          <div className="relative shrink-0">
            <ProgressRing value={completedCourses} max={courses.length || 1} size={72} stroke={7} color="#6366f1" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[color:var(--text-secondary)]">
              {courses.length > 0 ? Math.round((completedCourses / courses.length) * 100) : 0}%
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-white text-[color:var(--text-emerald-700)]">
              {completedCourses}<span className="text-sm font-normal text-[color:var(--text-tertiary)]"> / {courses.length}</span>
            </p>
            <p className="text-xs text-[color:var(--text-tertiary)] leading-tight">cursos completados</p>
          </div>
        </div>

        {/* Hours */}
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900/30">
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-white text-[color:var(--text-emerald-700)]">{hoursThisMonth}h</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">aprendiendo este mes</p>
          </div>
        </div>

        {/* Certificates */}
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-900/30">
            <Award className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white text-[color:var(--text-emerald-700)]">{certificatesEarned}</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">certificados obtenidos</p>
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-900/30">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white text-[color:var(--text-emerald-700)]">{streak} días</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">racha consecutiva</p>
          </div>
        </div>
      </div>

      {/* ── Featured Course Banner ── */}
      {featuredCourse && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-indigo-600 p-6 text-white shadow-lg">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute right-16 bottom-0 h-24 w-24 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/70 text-xs font-semibold mb-1">
                <Star className="h-3.5 w-3.5 text-yellow-300" />
                CURSO DEL MES
              </div>
              <h2 className="text-lg font-bold leading-snug">
                {featuredCourse.title}
              </h2>
              <p className="mt-1 text-sm text-white/70 line-clamp-2 max-w-md">
                {featuredCourse.description}
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />{formatDuration(featuredCourse.durationMin)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />{featuredCourse.stats.totalEnrolled} inscritos
                </span>
                {featuredCourse.isObligatory && (
                  <span className="rounded-full bg-red-500/80 px-2 py-0.5 font-semibold text-white">
                    Obligatorio
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/dashboard/capacitaciones/${featuredCourse.id}`}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow hover:bg-white/90 transition-colors"
            >
              <Play className="h-4 w-4" /> Comenzar ahora
            </Link>
          </div>
        </div>
      )}

      {/* ── My Learning Path ── */}
      {courses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Obligatory pending */}
          <div className="lg:col-span-2 rounded-xl border border-amber-800 bg-amber-900/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-700">
                Cursos Obligatorios Pendientes
              </h3>
              <span className="ml-auto rounded-full bg-amber-800 px-2 py-0.5 text-xs font-bold text-amber-700">
                {obligatoryPending.length}
              </span>
            </div>
            <div className="space-y-2">
              {obligatoryPending.slice(0, 3).map(c => {
                const catConf = CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG.GENERAL
                const CIcon = catConf.icon
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/capacitaciones/${c.id}`}
                    className="flex items-center gap-3 rounded-lg bg-white border border-[color:var(--border-default)] px-3 py-2.5 hover:border-amber-400 transition-colors group"
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', catConf.bg)}>
                      <CIcon className={cn('h-4 w-4', catConf.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white text-[color:var(--text-emerald-700)] group-hover:text-amber-700 group-hover:text-amber-400 truncate">
                        {c.title}
                      </p>
                      <p className="text-[10px] text-[color:var(--text-tertiary)]">{formatDuration(c.durationMin)} · {c.lessons.length} lecciones</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
                  </Link>
                )
              })}
              {obligatoryPending.length > 3 && (
                <p className="text-center text-xs text-amber-400 pt-1">
                  +{obligatoryPending.length - 3} más obligatorios
                </p>
              )}
            </div>
          </div>

          {/* Certified employee badge + next recommended */}
          <div className="flex flex-col gap-3">
            {/* Badge progress */}
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-[color:var(--text-secondary)]">Empleado Certificado</span>
              </div>
              <p className="text-[10px] text-[color:var(--text-tertiary)]">
                Completa todos los cursos obligatorios para obtener esta insignia.
              </p>
              <div className="mt-1">
                <div className="flex justify-between text-[10px] text-[color:var(--text-tertiary)] mb-1">
                  <span>{completedCourses} de {globalStats.obligatoryCourses} obligatorios</span>
                  <span className="font-semibold">
                    {globalStats.obligatoryCourses > 0
                      ? Math.round((completedCourses / globalStats.obligatoryCourses) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[color:var(--neutral-100)]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                    style={{
                      width: `${globalStats.obligatoryCourses > 0
                        ? Math.min(100, Math.round((completedCourses / globalStats.obligatoryCourses) * 100))
                        : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Next recommended */}
            {nextRecommended && (
              <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold text-[color:var(--text-secondary)]">Próximo recomendado</span>
                </div>
                <p className="text-xs font-semibold text-white text-[color:var(--text-emerald-700)] line-clamp-2">
                  {nextRecommended.title}
                </p>
                <p className="text-[10px] text-[color:var(--text-tertiary)] mt-0.5">
                  {formatDuration(nextRecommended.durationMin)}
                </p>
                <Link
                  href={`/dashboard/capacitaciones/${nextRecommended.id}`}
                  className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:underline"
                >
                  <Play className="h-3 w-3" /> Empezar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Catalog Stats (compact) ── */}
      {courses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3 text-center">
            <p className="text-xl font-bold text-white text-[color:var(--text-emerald-700)]">{globalStats.totalCourses}</p>
            <p className="text-[10px] text-[color:var(--text-tertiary)]">Cursos disponibles</p>
          </div>
          <div className="rounded-xl border border-red-800 bg-red-900/20 p-3 text-center">
            <p className="text-xl font-bold text-red-400">{globalStats.obligatoryCourses}</p>
            <p className="text-[10px] text-red-400">Obligatorios</p>
          </div>
          <div className="rounded-xl border border-blue-800 bg-blue-900/20 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{globalStats.totalEnrolled}</p>
            <p className="text-[10px] text-emerald-600">Inscritos total</p>
          </div>
          <div className="rounded-xl border border-green-800 bg-green-900/20 p-3 text-center">
            <p className="text-xl font-bold text-green-400">{globalStats.totalPassed}</p>
            <p className="text-[10px] text-green-400">Aprobados</p>
          </div>
          <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3 text-center">
            <p className="text-xl font-bold text-purple-400">{globalStats.avgCompletionRate}%</p>
            <p className="text-[10px] text-[color:var(--text-tertiary)]">Tasa promedio</p>
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[color:var(--border-default)] bg-white py-2 pl-9 pr-3 text-sm text-white text-[color:var(--text-emerald-700)] placeholder-gray-400 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-[color:var(--border-default)] bg-white py-2 pl-3 pr-8 text-sm text-[color:var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="obligatorio">Obligatorio primero</option>
              <option value="popular">Más popular</option>
              <option value="reciente">Más reciente</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              showFilters || activeFilterCount > 0
                ? 'border-primary bg-emerald-50 text-emerald-700 bg-emerald-50'
                : 'border-[color:var(--border-default)] border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)]'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex flex-wrap gap-4">
            {/* Category */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[color:var(--text-tertiary)]">Categoría</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                    !categoryFilter ? 'bg-emerald-600 text-white' : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]'
                  )}
                >Todas</button>
                {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
                  <button key={key} onClick={() => setCategoryFilter(categoryFilter === key ? '' : key)}
                    className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      categoryFilter === key ? 'bg-emerald-600 text-white' : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]'
                    )}
                  >{conf.label}</button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[color:var(--text-tertiary)]">Dificultad</p>
              <div className="flex gap-1.5">
                {(['', 'BASICO', 'INTERMEDIO', 'AVANZADO'] as const).map(d => (
                  <button key={d} onClick={() => setDiffFilter(d)}
                    className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      diffFilter === d ? 'bg-emerald-600 text-white' : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-200)]'
                    )}
                  >{d === '' ? 'Todas' : DIFFICULTY_CONFIG[d].label}</button>
                ))}
              </div>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setCategoryFilter(''); setDiffFilter(''); setStatusFilter('') }}
                className="ml-auto flex items-center gap-1 text-xs text-red-400 hover:underline"
              >
                <X className="h-3 w-3" /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Course Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-[color:var(--text-secondary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">No hay cursos disponibles.</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Carga el catálogo usando el botón superior.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-white p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-[color:var(--text-secondary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">No se encontraron cursos con esos filtros.</p>
          <button
            onClick={() => { setSearch(''); setCategoryFilter(''); setDiffFilter('') }}
            className="mt-2 text-xs text-emerald-700 hover:underline"
          >Limpiar filtros</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[color:var(--text-tertiary)]">
              {filtered.length} curso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            {(search || activeFilterCount > 0) && (
              <button
                onClick={() => { setSearch(''); setCategoryFilter(''); setDiffFilter('') }}
                className="text-xs text-emerald-700 hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Quitar filtros
              </button>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
