'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BookOpen, Clock, CheckCircle, Circle, Award,
  Loader2, ChevronRight, FileText, AlertTriangle, Lock,
  Play, HardHat, Shield, Scale, BarChart3, Users, GraduationCap,
  Download, Share2, Star, Flame, ChevronDown, ChevronUp,
  Video, Volume2, Maximize2, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeHtml } from '@/lib/sanitize'

interface Lesson {
  id: string
  title: string
  description: string | null
  contentType: string
  contentHtml: string | null
  durationMin: number
  sortOrder: number
  videoUrl?: string | null
}

interface ExamQuestion {
  id: string
  question: string
  options: string[]
  sortOrder: number
}

interface CourseDetail {
  id: string
  title: string
  description: string | null
  category: string
  durationMin: number
  isObligatory: boolean
  passingScore: number
  lessons: Lesson[]
}

type Phase = 'overview' | 'lesson' | 'exam' | 'results'

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SST:                { label: 'Seguridad y Salud',   color: 'text-amber-600 text-amber-400',   bg: 'bg-amber-50 bg-amber-900/30',   border: 'border-amber-200 border-amber-800' },
  HOSTIGAMIENTO:      { label: 'Hostigamiento Sexual', color: 'text-red-600 text-red-400',       bg: 'bg-red-50 bg-red-900/30',       border: 'border-red-200 border-red-800' },
  DERECHOS_LABORALES: { label: 'Derechos Laborales',  color: 'text-blue-600 text-blue-400',     bg: 'bg-blue-50 bg-blue-900/30',     border: 'border-blue-200 border-blue-800' },
  CONTRATOS:          { label: 'Contratos',           color: 'text-purple-600 text-purple-400', bg: 'bg-purple-50 bg-purple-900/30', border: 'border-purple-200 border-purple-800' },
  PLANILLA:           { label: 'Planilla',            color: 'text-emerald-600 text-emerald-400', bg: 'bg-emerald-50 bg-emerald-900/30', border: 'border-emerald-200 border-emerald-800' },
  INSPECCIONES:       { label: 'Inspecciones SUNAFIL', color: 'text-orange-600 text-orange-400', bg: 'bg-orange-50 bg-orange-900/30', border: 'border-orange-200 border-orange-800' },
  IGUALDAD:           { label: 'Igualdad Salarial',   color: 'text-pink-600 text-pink-400',     bg: 'bg-pink-50 bg-pink-900/30',     border: 'border-pink-200 border-pink-800' },
  GENERAL:            { label: 'General',             color: 'text-gray-400',     bg: 'bg-white/[0.02] bg-gray-700',        border: 'border-white/[0.08] border-gray-600' },
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── Video Player Placeholder ────────────────────────────────────────────────
function VideoPlayer({ videoUrl, title }: { videoUrl?: string | null; title: string }) {
  const [playing, setPlaying] = useState(false)

  // Detect YouTube URL and extract video ID
  const ytMatch = videoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  const ytId = ytMatch?.[1]

  if (ytId && playing) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  if (videoUrl && !ytId && playing) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: '56.25%' }}>
        <video
          className="absolute inset-0 h-full w-full"
          src={videoUrl}
          controls
          autoPlay
          title={title}
        />
      </div>
    )
  }

  // Thumbnail / placeholder
  return (
    <div
      className="relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 from-slate-900 to-black"
      style={{ paddingTop: '56.25%' }}
      onClick={() => setPlaying(true)}
    >
      {/* Abstract background pattern */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)' }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#141824]/20 backdrop-blur-sm ring-2 ring-white/30 transition-transform hover:scale-110">
          <Play className="h-8 w-8 fill-white text-white ml-1" />
        </div>
        <p className="text-sm font-semibold text-white/90 px-4 text-center line-clamp-2 max-w-xs">{title}</p>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Video className="h-3 w-3" />
          {videoUrl ? 'Reproducir video' : 'Vista previa del curso'}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-black/40 px-4 py-2.5 backdrop-blur-sm">
        <Play className="h-3.5 w-3.5 text-white/60" />
        <div className="flex-1 h-1 rounded-full bg-[#141824]/20">
          <div className="h-1 w-0 rounded-full bg-[#141824]/60" />
        </div>
        <Volume2 className="h-3.5 w-3.5 text-white/60" />
        <Maximize2 className="h-3.5 w-3.5 text-white/60" />
      </div>
    </div>
  )
}

// ─── Certificate Preview ─────────────────────────────────────────────────────
function CertificatePreview({ courseName, code }: { courseName: string; code: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 border-amber-700 bg-gradient-to-br from-amber-50 via-white to-amber-50 from-amber-900/20 via-slate-800 to-amber-900/20 p-6 text-center shadow-lg">
      {/* Corner decorations */}
      <div className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-amber-400 border-amber-600 rounded-tl-sm" />
      <div className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r-2 border-t-2 border-amber-400 border-amber-600 rounded-tr-sm" />
      <div className="pointer-events-none absolute left-3 bottom-3 h-8 w-8 border-l-2 border-b-2 border-amber-400 border-amber-600 rounded-bl-sm" />
      <div className="pointer-events-none absolute right-3 bottom-3 h-8 w-8 border-r-2 border-b-2 border-amber-400 border-amber-600 rounded-br-sm" />

      <Award className="mx-auto h-12 w-12 text-amber-500 text-amber-400" />
      <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-amber-600 text-amber-400">
        Certificado de Aprobación
      </p>
      <h3 className="mt-1 text-base font-bold text-white text-slate-100 leading-snug">
        {courseName}
      </h3>
      <p className="mt-1 text-xs text-gray-500 text-gray-400">
        LegalIA Pro — Cumplimiento Normativo
      </p>
      <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 bg-amber-900/30 px-3 py-1.5">
        <Star className="h-3.5 w-3.5 text-amber-600 text-amber-400" />
        <span className="font-mono text-sm font-bold text-amber-700 text-amber-400 tracking-wider">{code}</span>
      </div>
      <p className="mt-2 text-[10px] text-gray-400 text-slate-500">
        Verificable en comply360.pe/verify/{code}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
          <Download className="h-3 w-3" /> Descargar PDF
        </button>
        <button className="flex items-center gap-1.5 rounded-lg border border-amber-300 border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-700 text-amber-400 hover:bg-amber-50 hover:bg-amber-900/30 transition-colors">
          <Share2 className="h-3 w-3" /> Compartir
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const [currentWorkerId, setCurrentWorkerId] = useState<string | null>(null)
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('overview')
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  // Exam state
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [examResults, setExamResults] = useState<{
    score: number; passed: boolean; correct: number; total: number;
    passingScore: number; results: { questionId: string; isCorrect: boolean; correctIndex: number; explanation: string }[];
    certificate?: { code: string; qrData: string }
  } | null>(null)
  const [submittingExam, setSubmittingExam] = useState(false)

  // Cargar workerId del usuario autenticado para tracking real
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => { if (d.workerId) setCurrentWorkerId(d.workerId) })
      .catch(() => null)
  }, [])

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        const found = (data.courses || []).find((c: CourseDetail) => c.id === courseId)
        if (found) setCourse(found)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId])

  async function markLessonComplete(lessonId: string) {
    setCompletedLessons(prev => new Set(prev).add(lessonId))
    try {
      await fetch(`/api/courses/${courseId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: currentWorkerId ?? 'preview', lessonId, completed: true }),
      })
    } catch { /* ignore */ }
  }

  async function startExam() {
    try {
      const res = await fetch(`/api/courses/${courseId}/exam`)
      const data = await res.json()
      setExamQuestions(data.questions || [])
      setAnswers({})
      setExamResults(null)
      setPhase('exam')
    } catch { /* ignore */ }
  }

  async function submitExam() {
    setSubmittingExam(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: currentWorkerId ?? 'preview', answers }),
      })
      const data = await res.json()
      setExamResults(data)
      setPhase('results')
    } catch { /* ignore */ }
    finally { setSubmittingExam(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-20">
        <GraduationCap className="mx-auto h-12 w-12 text-gray-300 text-slate-600" />
        <p className="mt-3 text-gray-500 text-gray-400">Curso no encontrado.</p>
        <Link href="/dashboard/capacitaciones" className="mt-2 inline-block text-sm text-primary hover:underline">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const catConfig = CATEGORY_CONFIG[course.category] || CATEGORY_CONFIG.GENERAL
  const allLessonsComplete = course.lessons.length > 0 && course.lessons.every(l => completedLessons.has(l.id))
  const completionPct = course.lessons.length > 0
    ? Math.round((completedLessons.size / course.lessons.length) * 100)
    : 0

  // Demo video URL for preview (use first lesson's videoUrl if present, else demo)
  const demoVideoUrl = course.lessons[0]?.videoUrl || null

  // ===== OVERVIEW =====
  if (phase === 'overview') {
    return (
      <div className="space-y-6 pb-8">
        {/* Back */}
        <Link href="/dashboard/capacitaciones"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 text-gray-400 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        {/* Banner preview para usuarios sin perfil de trabajador */}
        {!currentWorkerId && phase === 'overview' && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 bg-amber-900/20 border border-amber-200 border-amber-800 rounded-xl text-xs text-amber-800 text-amber-300">
            <span className="text-amber-500 text-base shrink-0">👁</span>
            <span>
              <span className="font-semibold">Modo vista previa.</span> Tu cuenta no tiene perfil de trabajador vinculado. El progreso y exámenes se guardarán en modo de previsualización.
            </span>
          </div>
        )}

        {/* Hero */}
        <div className={cn('rounded-2xl overflow-hidden border border-white/[0.08]')}>
          {/* Video at top */}
          <VideoPlayer videoUrl={demoVideoUrl} title={course.title} />

          {/* Course info below video */}
          <div className="p-5 bg-[#141824]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', catConfig.bg, catConfig.color)}>
                    {catConfig.label}
                  </span>
                  {course.isObligatory && (
                    <span className="rounded-full bg-red-100 bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-700 text-red-400">
                      Obligatorio
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white text-slate-100 leading-snug">
                  {course.title}
                </h1>
                <p className="mt-1 text-sm text-gray-500 text-gray-400">{course.description}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-400 text-slate-500">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {course.lessons.length} lecciones
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(course.durationMin)}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Nota mínima: {course.passingScore}%
              </span>
            </div>

            {/* My progress bar */}
            {completedLessons.size > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-primary/5 bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-primary">Mi progreso</span>
                  <span className="font-bold text-primary">{completionPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-primary/20">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500 text-gray-400">
                  {completedLessons.size} de {course.lessons.length} lecciones completadas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lesson list */}
        <div className="rounded-xl border border-white/[0.08] bg-[#141824] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <h2 className="text-sm font-bold text-white text-slate-100">Contenido del Curso</h2>
            <span className="text-xs text-gray-400 text-slate-500">
              {completedLessons.size}/{course.lessons.length} completadas
            </span>
          </div>
          <div className="divide-y divide-slate-700">
            {course.lessons.map((lesson, idx) => {
              const isComplete = completedLessons.has(lesson.id)
              const isExpanded = expandedLesson === lesson.id

              return (
                <div key={lesson.id}>
                  <div className={cn(
                    'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors',
                    isComplete ? 'bg-green-50/50 bg-green-900/10' : 'hover:bg-white/[0.02] hover:bg-white/[0.04]/50'
                  )}>
                    {/* Status icon */}
                    <button
                      onClick={() => !isComplete && markLessonComplete(lesson.id)}
                      className="shrink-0 transition-transform hover:scale-110"
                      title={isComplete ? 'Completada' : 'Marcar como completada'}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5 text-green-500 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 text-slate-600" />
                      )}
                    </button>

                    {/* Lesson info - clickable to enter player */}
                    <button
                      onClick={() => { setCurrentLessonIdx(idx); setPhase('lesson') }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-sm font-medium transition-colors',
                          isComplete
                            ? 'text-green-700 text-green-400'
                            : 'text-white text-slate-100 hover:text-primary hover:text-primary'
                        )}>
                          {idx + 1}. {lesson.title}
                        </p>
                        {lesson.description && (
                          <p className="text-xs text-gray-500 text-gray-400 mt-0.5 line-clamp-1">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lesson.contentType === 'VIDEO' && (
                          <Video className="h-3.5 w-3.5 text-gray-400 text-slate-500" />
                        )}
                        <span className="text-xs text-gray-400 text-slate-500">{lesson.durationMin} min</span>
                      </div>
                    </button>

                    {/* Expand toggle for description */}
                    {lesson.description && lesson.description.length > 60 && (
                      <button
                        onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                        className="shrink-0 text-gray-300 text-slate-600 hover:text-gray-500 hover:text-slate-400"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => { setCurrentLessonIdx(idx); setPhase('lesson') }}
                      className="shrink-0"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-300 text-slate-600 hover:text-primary transition-colors" />
                    </button>
                  </div>

                  {/* Expanded description */}
                  {isExpanded && lesson.description && (
                    <div className="px-14 pb-3 text-xs text-gray-500 text-gray-400 bg-white/[0.02] bg-white/[0.04]/30">
                      {lesson.description}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Exam section */}
        <div className={cn(
          'rounded-xl border p-5',
          allLessonsComplete
            ? 'border-primary/30 border-primary/20 bg-primary/5 bg-primary/10'
            : 'border-white/[0.08] bg-[#141824]'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              allLessonsComplete ? 'bg-primary/10 bg-primary/20' : 'bg-white/[0.04]'
            )}>
              <FileText className={cn('h-5 w-5', allLessonsComplete ? 'text-primary' : 'text-gray-400 text-slate-500')} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-white text-slate-100">Evaluación Final</h2>
              <p className="mt-0.5 text-xs text-gray-500 text-gray-400">
                {allLessonsComplete
                  ? `¡Listo! Completa el examen para obtener tu certificado. Necesitas ${course.passingScore}% para aprobar.`
                  : `Completa todas las lecciones para desbloquear la evaluación. Necesitas ${course.passingScore}% para aprobar y obtener tu certificado.`
                }
              </p>
              <button
                onClick={startExam}
                disabled={!allLessonsComplete}
                className={cn(
                  'mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                  allLessonsComplete
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow'
                    : 'bg-white/[0.04] text-gray-400 text-slate-500 cursor-not-allowed'
                )}
              >
                {allLessonsComplete ? (
                  <><FileText className="h-4 w-4" /> Tomar Examen</>
                ) : (
                  <><Lock className="h-4 w-4" /> Completa las lecciones primero</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== LESSON PLAYER =====
  if (phase === 'lesson') {
    const lesson = course.lessons[currentLessonIdx]
    if (!lesson) { setPhase('overview'); return null }
    const isComplete = completedLessons.has(lesson.id)

    return (
      <div className="space-y-5 pb-8">
        {/* Back */}
        <button
          onClick={() => setPhase('overview')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 text-gray-400 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al curso
        </button>

        {/* Lesson navigation pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {course.lessons.map((l, idx) => (
            <button
              key={l.id}
              onClick={() => setCurrentLessonIdx(idx)}
              title={l.title}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                idx === currentLessonIdx
                  ? 'bg-primary text-white shadow-md scale-110'
                  : completedLessons.has(l.id)
                    ? 'bg-green-100 bg-green-900/30 text-green-700 text-green-400'
                    : 'bg-white/[0.04] text-gray-500 text-gray-400 hover:bg-gray-200 hover:bg-slate-600'
              )}
            >
              {completedLessons.has(l.id) ? <CheckCircle className="h-4 w-4" /> : idx + 1}
            </button>
          ))}
          <span className="ml-2 text-xs text-gray-400 text-slate-500">
            {currentLessonIdx + 1} / {course.lessons.length}
          </span>
        </div>

        {/* Video */}
        <VideoPlayer videoUrl={lesson.videoUrl || demoVideoUrl} title={lesson.title} />

        {/* Lesson content */}
        <div className="rounded-xl border border-white/[0.08] bg-[#141824] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
            <div>
              <p className="text-xs text-gray-400 text-slate-500 font-medium">
                Lección {currentLessonIdx + 1} de {course.lessons.length}
              </p>
              <h1 className="text-base font-bold text-white text-slate-100 leading-snug">
                {lesson.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 text-slate-500 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />{lesson.durationMin} min
              </span>
              {isComplete && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 text-green-400">
                  <CheckCircle className="h-3 w-3" /> Completada
                </span>
              )}
            </div>
          </div>

          <div className="p-5">
            {lesson.description && (
              <p className="mb-4 text-sm text-gray-500 text-gray-400">{lesson.description}</p>
            )}

            {lesson.contentHtml ? (
              <div
                className="prose prose-sm max-w-none
                  prose-headings:text-white prose-headings:text-slate-100
                  prose-p:text-gray-600 prose-p:text-slate-300
                  prose-li:text-gray-600 prose-li:text-slate-300
                  prose-strong:text-gray-200 prose-strong:text-slate-200
                  prose-table:text-sm
                  prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.contentHtml) }}
              />
            ) : (
              <div className="rounded-xl bg-white/[0.02] bg-white/[0.04]/50 p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-gray-300 text-slate-600" />
                <p className="mt-2 text-sm text-gray-500 text-gray-400">Contenido no disponible.</p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">
                  Mira el video de la lección para continuar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => currentLessonIdx > 0 && setCurrentLessonIdx(currentLessonIdx - 1)}
            disabled={currentLessonIdx === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </button>

          <div className="flex items-center gap-2">
            {!isComplete && (
              <button
                onClick={() => markLessonComplete(lesson.id)}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
              >
                <CheckCircle className="h-4 w-4" /> Marcar completada
              </button>
            )}

            {currentLessonIdx < course.lessons.length - 1 ? (
              <button
                onClick={() => {
                  if (!isComplete) markLessonComplete(lesson.id)
                  setCurrentLessonIdx(currentLessonIdx + 1)
                }}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isComplete) markLessonComplete(lesson.id)
                  setPhase('overview')
                }}
                className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
              >
                Finalizar Lecciones <CheckCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Hint: take exam when all done */}
        {allLessonsComplete && (
          <div className="rounded-xl border border-primary/30 border-primary/20 bg-primary/5 bg-primary/10 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-semibold text-primary">
                ¡Has completado todas las lecciones!
              </p>
            </div>
            <button
              onClick={startExam}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              <FileText className="h-4 w-4" /> Tomar Examen
            </button>
          </div>
        )}
      </div>
    )
  }

  // ===== EXAM =====
  if (phase === 'exam') {
    const allAnswered = examQuestions.length > 0 && Object.keys(answers).length === examQuestions.length
    const answeredCount = Object.keys(answers).length

    return (
      <div className="space-y-6 pb-8">
        <button
          onClick={() => setPhase('overview')}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 text-gray-400 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Cancelar evaluación
        </button>

        <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white text-slate-100">
                Evaluación: {course.title}
              </h1>
              <p className="text-xs text-gray-500 text-gray-400 mt-0.5">
                Responde todas las preguntas. Necesitas {course.passingScore}% para aprobar y obtener tu certificado.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 text-gray-400 shrink-0">
              {answeredCount}/{examQuestions.length}
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/[0.04]">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${examQuestions.length > 0 ? (answeredCount / examQuestions.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 text-slate-500 shrink-0">
              {examQuestions.length > 0 ? Math.round((answeredCount / examQuestions.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {examQuestions.map((q, idx) => (
            <div key={q.id} className={cn(
              'rounded-xl border border-white/[0.08] bg-[#141824] p-5 transition-all',
              answers[q.id] !== undefined ? 'ring-1 ring-primary/20 border-primary/30' : ''
            )}>
              <div className="flex items-start gap-3 mb-3">
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  answers[q.id] !== undefined
                    ? 'bg-primary text-white'
                    : 'bg-white/[0.04] text-gray-500 text-gray-400'
                )}>
                  {idx + 1}
                </span>
                <p className="text-sm font-semibold text-white text-slate-100">{q.question}</p>
              </div>
              <div className="space-y-2 pl-9">
                {(q.options as string[]).map((option, optIdx) => (
                  <button
                    key={optIdx}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all',
                      answers[q.id] === optIdx
                        ? 'border-primary bg-primary/5 bg-primary/10 text-white text-slate-100'
                        : 'border-white/[0.08] border-slate-600 hover:bg-white/[0.02] hover:bg-white/[0.04]/50 text-slate-300'
                    )}
                  >
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                      answers[q.id] === optIdx
                        ? 'border-primary bg-primary text-white'
                        : 'border-white/10 border-slate-600 text-gray-400 text-slate-500'
                    )}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={submitExam}
          disabled={!allAnswered || submittingExam}
          className={cn(
            'w-full rounded-xl py-3.5 text-sm font-bold transition-all shadow-sm',
            allAnswered && !submittingExam
              ? 'bg-primary text-white hover:bg-primary/90 hover:shadow-md'
              : 'bg-white/[0.04] text-gray-400 text-slate-500 cursor-not-allowed'
          )}
        >
          {submittingExam ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Evaluando...
            </span>
          ) : (
            `Enviar Respuestas (${answeredCount}/${examQuestions.length})`
          )}
        </button>
      </div>
    )
  }

  // ===== RESULTS =====
  if (phase === 'results' && examResults) {
    return (
      <div className="space-y-6 pb-8">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Score card */}
          <div className={cn(
            'rounded-2xl border p-8 text-center',
            examResults.passed
              ? 'bg-green-50 bg-green-900/20 border-green-200 border-green-800'
              : 'bg-red-50 bg-red-900/20 border-red-200 border-red-800'
          )}>
            <div className={cn(
              'mx-auto flex h-24 w-24 items-center justify-center rounded-full',
              examResults.passed ? 'bg-green-100 bg-green-900/40' : 'bg-red-100 bg-red-900/40'
            )}>
              {examResults.passed ? (
                <Award className="h-12 w-12 text-green-600 text-green-400" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-red-600 text-red-400" />
              )}
            </div>
            <h2 className={cn(
              'mt-4 text-2xl font-bold',
              examResults.passed ? 'text-green-700 text-green-400' : 'text-red-700 text-red-400'
            )}>
              {examResults.passed ? '¡Aprobado!' : 'No aprobado'}
            </h2>
            <p className={cn('mt-1 text-5xl font-bold',
              examResults.passed ? 'text-green-600 text-green-400' : 'text-red-600 text-red-400'
            )}>
              {examResults.score}%
            </p>
            <p className="mt-2 text-sm text-gray-500 text-gray-400">
              {examResults.correct} de {examResults.total} correctas · Mínimo: {examResults.passingScore}%
            </p>
          </div>

          {/* Certificate */}
          {examResults.passed && examResults.certificate && (
            <CertificatePreview
              courseName={course.title}
              code={examResults.certificate.code}
            />
          )}

          {/* Retry hint */}
          {!examResults.passed && (
            <div className="rounded-xl border border-amber-200 border-amber-800 bg-amber-50 bg-amber-900/20 p-4">
              <p className="text-sm font-semibold text-amber-800 text-amber-300">
                Puedes volver a intentarlo
              </p>
              <p className="mt-0.5 text-xs text-amber-600 text-amber-400">
                Revisa las lecciones que necesitas reforzar y vuelve a tomar el examen.
              </p>
            </div>
          )}

          {/* Answer review */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white text-slate-100">Revisión de respuestas</h3>
            {examResults.results.map((r, idx) => {
              const q = examQuestions[idx]
              return (
                <div
                  key={r.questionId}
                  className={cn(
                    'rounded-xl border p-4',
                    r.isCorrect
                      ? 'bg-green-50 bg-green-900/20 border-green-200 border-green-800'
                      : 'bg-red-50 bg-red-900/20 border-red-200 border-red-800'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {r.isCorrect ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-600 text-green-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-200">
                        {q?.question}
                      </p>
                      {!r.isCorrect && (
                        <p className="mt-1 text-xs text-gray-500 text-gray-400">
                          Respuesta correcta: <strong>{String.fromCharCode(65 + r.correctIndex)}</strong>
                          {r.explanation && ` — ${r.explanation}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/dashboard/capacitaciones"
              className="flex-1 rounded-xl border border-slate-600 px-4 py-3 text-center text-sm font-semibold text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              Volver al Catálogo
            </Link>
            {!examResults.passed && (
              <button
                onClick={startExam}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors shadow-sm"
              >
                Reintentar Examen
              </button>
            )}
            {examResults.passed && (
              <button
                onClick={() => setPhase('overview')}
                className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 px-4 py-3 text-sm font-bold text-white transition-colors shadow-sm"
              >
                Ver Curso
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
