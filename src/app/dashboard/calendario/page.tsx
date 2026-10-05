'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Shield,
  Info,
  ArrowRight,
  Landmark,
  PiggyBank,
  Gift,
  Banknote,
  UserCheck,
  FileSignature,
  HardHat,
  Cake,
  TriangleAlert,
  Award,
  Hourglass,
  Palmtree,
  PenLine,
  GraduationCap,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFeriadosForYear } from '@/lib/legal-engine/feriados-peru'
import { PageHeader } from '@/components/comply360/editorial-title'
import { Button } from '@/components/ui/button'
import {
  resolveCalendarEventAction,
  type AlertLookupEntry,
  type CalendarEventAction,
  type EventCategory,
} from './_lib/event-actions'

// =============================================
// Types
// =============================================

// `EventCategory` vive en ./_lib/event-actions (junto al mapeo de enlaces).

interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  category: EventCategory
  description: string
  law?: string
  /** `id` original de /api/calendar (permite enlazar a la entidad concreta). */
  sourceId?: string
}

// =============================================
// Style maps
// =============================================

const CATEGORY_STYLES: Record<EventCategory, { bg: string; text: string; border: string; dot: string; badge: string }> = {
  feriado: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  cts: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  },
  gratificacion: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  afp: {
    bg: 'bg-blue-500/20',
    text: 'text-emerald-600',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-emerald-600 border-blue-500/30',
  },
  tregistro: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  contrato: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  sst: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  cumpleanos: {
    bg: 'bg-pink-500/20',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    dot: 'bg-pink-500',
    badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  },
  alerta: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  // Categorías nuevas Sprint 9
  aniversario: {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    dot: 'bg-fuchsia-500',
    badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  },
  prueba: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  vacaciones: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  firma: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  capacitacion: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  feriado: 'Feriado',
  cts: 'CTS',
  gratificacion: 'Gratificación',
  afp: 'AFP/ONP',
  tregistro: 'T-Registro',
  contrato: 'Contratos',
  sst: 'SST',
  cumpleanos: 'Cumpleaños',
  alerta: 'Alertas',
  aniversario: 'Aniversarios',
  prueba: 'Período prueba',
  vacaciones: 'Vacaciones',
  firma: 'Plazos firma',
  capacitacion: 'Capacitaciones',
}

/**
 * Un ícono distinto por categoría: el tipo de evento se reconoce por forma
 * (y por texto en el detalle), no solo por color.
 */
const CATEGORY_ICONS: Record<EventCategory, typeof CalendarIcon> = {
  feriado: Landmark,
  cts: PiggyBank,
  gratificacion: Gift,
  afp: Banknote,
  tregistro: UserCheck,
  contrato: FileSignature,
  sst: HardHat,
  cumpleanos: Cake,
  alerta: TriangleAlert,
  aniversario: Award,
  prueba: Hourglass,
  vacaciones: Palmtree,
  firma: PenLine,
  capacitacion: GraduationCap,
}

/** Orden en que se muestran los íconos dentro de cada día (lo accionable primero). */
const CATEGORY_PRIORITY: EventCategory[] = [
  'alerta', 'contrato', 'cts', 'gratificacion', 'afp', 'tregistro', 'sst', 'firma',
  'prueba', 'capacitacion', 'vacaciones', 'feriado', 'aniversario', 'cumpleanos',
]

/** Máximo de íconos visibles por día en la grilla (el resto se resume en "+N"). */
const MAX_DAY_ICONS = 3

/** Tarjeta "Fechas clave": cada fecha con su enlace para actuar. */
const KEY_DATES: Array<{ category: EventCategory; title: string; when: string }> = [
  { category: 'cts', title: 'CTS', when: '15 de mayo y 15 de noviembre' },
  { category: 'gratificacion', title: 'Gratificaciones', when: 'Primera quincena de julio y de diciembre' },
  { category: 'afp', title: 'AFP/ONP', when: 'Declaración mensual (día 13)' },
  { category: 'tregistro', title: 'T-Registro', when: 'Dentro de las 24 horas de cada cambio' },
]

// Algunas fuentes de la API anteponen emojis al título; el ícono de categoría
// ya cumple ese rol. Se construye con RegExp para no depender del target de TS.
const LEADING_EMOJI = new RegExp('^[\\p{Extended_Pictographic}\\uFE0F\\u200D\\s]+', 'u')

function cleanTitle(title: string): string {
  return title.replace(LEADING_EMOJI, '').trim() || title
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
}

const DAYS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// =============================================
// Build RRHH compliance events for a given year
// =============================================

function buildRRHHEvents(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = []

  // CTS deposit deadlines: May 15, Nov 15
  events.push({
    id: `cts-may-${year}`,
    title: 'Depósito CTS',
    date: `${year}-05-15`,
    category: 'cts',
    description: 'Fecha límite para depósito de CTS (Nov-Abr)',
    law: 'D.S. 001-97-TR Art. 22',
  })
  events.push({
    id: `cts-nov-${year}`,
    title: 'Depósito CTS',
    date: `${year}-11-15`,
    category: 'cts',
    description: 'Fecha límite para depósito de CTS (May-Oct)',
    law: 'D.S. 001-97-TR Art. 22',
  })

  // Gratificaciones: July 15 and December 15
  events.push({
    id: `grat-jul-${year}`,
    title: 'Gratificación Julio',
    date: `${year}-07-15`,
    category: 'gratificacion',
    description: 'Fecha límite de pago de gratificación de Fiestas Patrias',
    law: 'Ley 27735 Art. 5',
  })
  events.push({
    id: `grat-dic-${year}`,
    title: 'Gratificación Diciembre',
    date: `${year}-12-15`,
    category: 'gratificacion',
    description: 'Fecha límite de pago de gratificación de Navidad',
    law: 'Ley 27735 Art. 5',
  })

  // AFP/ONP monthly declarations — typically due on business days around the 5th-15th
  // Using the first business week deadline (varies, we use the 13th as a reasonable date)
  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, '0')
    events.push({
      id: `afp-${monthStr}-${year}`,
      title: 'Declaración AFP/ONP',
      date: `${year}-${monthStr}-13`,
      category: 'afp',
      description: `Plazo para declaración y pago de aportes previsionales del mes anterior`,
      law: 'R. SBS 080-98',
    })
  }

  // T-Registro reminders: quarterly reminders (within 24h of any change, but we show quarterly checks)
  for (const m of [3, 6, 9, 12]) {
    const monthStr = String(m).padStart(2, '0')
    events.push({
      id: `treg-${monthStr}-${year}`,
      title: 'Revisión T-Registro',
      date: `${year}-${monthStr}-01`,
      category: 'tregistro',
      description: 'Verificar actualización de altas, bajas y modificaciones en T-Registro (plazo: 24h de cada cambio)',
      law: 'D.S. 015-2010-TR',
    })
  }

  return events
}

// =============================================
// Build all events for a year using the feriados engine
// =============================================

function buildAllEvents(year: number): CalendarEvent[] {
  const feriados = getFeriadosForYear(year)
  const feriadoEvents: CalendarEvent[] = feriados.map((f, i) => ({
    id: `feriado-${year}-${i}`,
    title: f.name,
    date: f.fullDate,
    category: 'feriado' as EventCategory,
    description: f.variable ? 'Feriado religioso variable' : 'Feriado nacional',
    law: f.law,
  }))

  const rrhhEvents = buildRRHHEvents(year)

  return [...feriadoEvents, ...rrhhEvents].sort((a, b) => a.date.localeCompare(b.date))
}

// =============================================
// Component
// =============================================

export default function CalendarioPage() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<EventCategory>>(
    new Set([
      'feriado', 'cts', 'gratificacion', 'afp', 'tregistro', 'contrato', 'sst',
      'cumpleanos', 'alerta',
      // Categorías nuevas Sprint 9 — todas activas por default
      'aniversario', 'prueba', 'vacaciones', 'firma', 'capacitacion',
    ])
  )
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  // Dynamic events from real API (contracts, SST, birthdays, alerts)
  const [apiEvents, setApiEvents] = useState<CalendarEvent[]>([])
  const [loadingApi, setLoadingApi] = useState(false)
  const [apiError, setApiError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Índice de alertas de trabajador (id → trabajador + tipo) para que los
  // eventos de alerta enlacen a la acción exacta (legajo, contratos…). Si no
  // carga, esos eventos enlazan a /dashboard/alertas: degradación aceptable.
  const [alertLookup, setAlertLookup] = useState<ReadonlyMap<string, AlertLookupEntry>>(() => new Map())

  useEffect(() => {
    let cancelled = false
    fetch('/api/workers/alerts')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json: { data?: Array<{ id: string; workerId: string; type: string; title: string }> }) => {
        if (cancelled) return
        setAlertLookup(new Map((json.data ?? []).map((a) => [a.id, { workerId: a.workerId, type: a.type, title: a.title }])))
      })
      .catch(() => {
        /* sin índice: los eventos de alerta usan el enlace genérico */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
    setLoadingApi(true)
    fetch(`/api/calendar?year=${currentYear}&month=${currentMonth}`)
      .then((r) => {
        // 401/403 = el plan o el rol no incluye estos eventos: no es una falla.
        if (r.status === 401 || r.status === 403) return { data: [] }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: { data?: Array<{ id: string; title: string; date: string; type: string; description: string }> }) => {
        const API_TYPE_MAP: Record<string, EventCategory> = {
          CONTRACT: 'contrato',
          SST: 'sst',
          BIRTHDAY: 'cumpleanos',
          ALERT: 'alerta',
          // Tipos nuevos Sprint 9 (Idea 2 Fase 1)
          WORKER_ANNIVERSARY: 'aniversario',
          PROBATION_END: 'prueba',
          VACATION: 'vacaciones',
          ACK_DEADLINE: 'firma',
          CAPACITACION: 'capacitacion',
          // LEGAL is already in static events — skip to avoid duplicates
        }
        const mapped = (data.data ?? [])
          .filter((e) => e.type !== 'LEGAL') // skip legal — already in static events
          .map((e) => ({
            id: `api-${e.id}`,
            sourceId: e.id,
            title: cleanTitle(e.title),
            date: e.date,
            category: (API_TYPE_MAP[e.type] ?? 'alerta') as EventCategory,
            description: e.description,
          }))
        setApiEvents(mapped)
        setApiError(false)
      })
      .catch(() => {
        setApiEvents([])
        setApiError(true)
      })
      .finally(() => setLoadingApi(false))
  }, [currentYear, currentMonth, reloadKey])

  const getEventAction = (e: CalendarEvent): CalendarEventAction | null =>
    resolveCalendarEventAction({ category: e.category, sourceId: e.sourceId }, alertLookup)

  // Build events for current year and adjacent years
  const allEvents = useMemo(() => {
    return [
      ...buildAllEvents(currentYear - 1),
      ...buildAllEvents(currentYear),
      ...buildAllEvents(currentYear + 1),
      ...apiEvents,
    ]
  }, [currentYear, apiEvents])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => activeFilters.has(e.category))
  }, [allEvents, activeFilters])

  // Events lookup by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of filteredEvents) {
      const existing = map.get(e.date) || []
      existing.push(e)
      map.set(e.date, existing)
    }
    return map
  }, [filteredEvents])

  // ── Calendar grid (Monday-start) ────────────
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  // Convert Sunday=0 to Monday-start: Mon=0, Tue=1, ..., Sun=6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

  const calendarCells: { day: number; inMonth: boolean; dateStr: string }[] = []

  // Previous month fill
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevM = currentMonth === 0 ? 11 : currentMonth - 1
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear
    calendarCells.push({
      day: d,
      inMonth: false,
      dateStr: `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      inMonth: true,
      dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  // Next month fill (to complete 6 rows)
  const totalCells = Math.ceil(calendarCells.length / 7) * 7
  const remaining = totalCells - calendarCells.length
  for (let d = 1; d <= remaining; d++) {
    const nextM = currentMonth === 11 ? 0 : currentMonth + 1
    const nextY = currentMonth === 11 ? currentYear + 1 : currentYear
    calendarCells.push({
      day: d,
      inMonth: false,
      dateStr: `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Events for selected date
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : []

  // Upcoming events (next 30 days from today, hasta 15 items)
  const upcomingEvents = useMemo(() => {
    // Calcular fecha de corte +30 días
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    return filteredEvents
      .filter((e) => e.date >= todayStr && e.date <= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15)
  }, [filteredEvents, todayStr])

  // Month events count
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const monthEventCount = filteredEvents.filter((e) => e.date.startsWith(monthStr)).length

  // ── Navigation ────────────
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
    setSelectedDate(null)
  }
  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(todayStr)
  }

  // ── Filter toggle ────────────
  const toggleFilter = (cat: EventCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  // ── Helper: check if a date is Sunday ────────────
  const isSunday = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.getDay() === 0
  }

  return (
    <div className="space-y-6">
      {/* Header editorial (Emerald Light) */}
      <PageHeader
        eyebrow="Calendario laboral"
        eyebrowIcon={<CalendarIcon className="w-3.5 h-3.5" />}
        title="Tu <em>calendario fiscal y laboral</em> peruano completo."
        subtitle="Feriados, depósitos de CTS, gratificaciones, AFP, T-Registro, contratos y SST en una sola vista. Toca un día para ver qué vence y ir directo a resolverlo."
      />

      {/* Category filters + Export iCal */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Mostrar u ocultar tipos de evento">
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => {
            const Icon = CATEGORY_ICONS[cat]
            const isActive = activeFilters.has(cat)
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleFilter(cat)}
                aria-pressed={isActive}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
                  isActive
                    ? CATEGORY_STYLES[cat].badge + ' border'
                    : 'bg-[color:var(--neutral-50)] text-[color:var(--text-tertiary)] border-[color:var(--border-default)] hover:bg-[color:var(--neutral-100)]'
                )}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                {CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>
        <a
          href={`/api/calendar/export.ics?year=${currentYear}`}
          download
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2"
          title="Descarga el calendario en formato iCal — importable a Google Calendar, Outlook, Apple Calendar"
        >
          <CalendarIcon className="w-3.5 h-3.5" aria-hidden />
          Sincronizar con Google/Outlook
        </a>
      </div>

      {apiError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-amber)] bg-[color:var(--color-warning-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-[color:var(--color-warning-text)]">
            <TriangleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            No pudimos cargar los eventos de tu empresa (contratos, alertas, SST). Por ahora solo ves las fechas legales generales.
          </p>
          <Button
            variant="secondary"
            size="xs"
            loading={loadingApi}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => setReloadKey((k) => k + 1)}
            className="shrink-0"
          >
            Reintentar
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Calendar Grid ─────────────────────── */}
        <div className="bg-white backdrop-blur-sm rounded-2xl border border-[color:var(--border-default)] shadow-xl p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-[color:var(--neutral-100)] rounded-xl transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5 text-[color:var(--text-tertiary)]" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-[color:var(--neutral-100)] rounded-xl transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5 text-[color:var(--text-tertiary)]" />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-[color:var(--text-emerald-700)]">
                {MONTHS_ES[currentMonth]} {currentYear}
              </h2>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5 flex items-center gap-1.5">
                {monthEventCount} evento{monthEventCount !== 1 ? 's' : ''} este mes
                {loadingApi && (
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Cargando eventos de la base de datos..." />
                )}
              </p>
            </div>
            <div className="w-[120px]" />
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_HEADER.map((d, i) => (
              <div
                key={d}
                className={cn(
                  'text-center text-xs font-semibold py-2 rounded-lg',
                  i >= 5 ? 'text-red-400/70' : 'text-[color:var(--text-tertiary)]'
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, i) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || []
              const hasFeriado = dayEvents.some((e) => e.category === 'feriado')
              const hasCTS = dayEvents.some((e) => e.category === 'cts' || e.category === 'gratificacion')
              const dayCategories = CATEGORY_PRIORITY.filter((cat) => dayEvents.some((e) => e.category === cat))
              const isToday = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDate
              const sunday = isSunday(cell.dateStr)
              const isHovered = cell.dateStr === hoveredDate
              const dayOfWeek = i % 7 // 0=Mon, 5=Sat, 6=Sun
              const showEvents = cell.inMonth && dayEvents.length > 0
              const dayLabel = formatDayLabel(cell.dateStr)
              const ariaLabel = showEvents
                ? `${dayLabel}: ${dayEvents.map((e) => `${CATEGORY_LABELS[e.category]}, ${e.title}`).join('; ')}`
                : dayLabel

              return (
                <div key={i} className="relative group">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                    onMouseEnter={() => setHoveredDate(cell.dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    aria-label={ariaLabel}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative w-full aspect-square flex flex-col items-center justify-start pt-2 rounded-xl text-sm transition-all duration-150',
                      // Base styles
                      cell.inMonth ? 'text-[color:var(--text-emerald-700)]' : 'text-[color:var(--text-secondary)]',
                      // Weekend/Sunday
                      cell.inMonth && (sunday || dayOfWeek === 5) && 'text-red-400/70',
                      // Feriado background
                      cell.inMonth && hasFeriado && 'bg-red-500/10',
                      // CTS/Gratificacion background
                      cell.inMonth && hasCTS && !hasFeriado && 'bg-emerald-50',
                      // Today highlight
                      isToday && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-slate-800',
                      // Selected
                      isSelected && 'bg-amber-500/20 ring-2 ring-amber-500',
                      // Hover
                      !isSelected && cell.inMonth && 'hover:bg-[color:var(--neutral-100)]',
                      !cell.inMonth && 'hover:bg-[color:var(--neutral-50)]/40',
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium leading-none',
                        isToday && 'text-amber-400 font-bold',
                        hasFeriado && cell.inMonth && 'text-red-400 font-bold',
                      )}
                    >
                      {cell.day}
                    </span>

                    {/* Un ícono por tipo de evento: se distingue por forma, no solo por color */}
                    {showEvents && (
                      <div className="flex items-center gap-0.5 mt-1.5 flex-wrap justify-center" aria-hidden>
                        {dayCategories.slice(0, MAX_DAY_ICONS).map((cat) => {
                          const Icon = CATEGORY_ICONS[cat]
                          return <Icon key={cat} className={cn('w-3 h-3', CATEGORY_STYLES[cat].text)} />
                        })}
                        {dayCategories.length > MAX_DAY_ICONS && (
                          <span className="text-[9px] font-semibold leading-none text-[color:var(--text-tertiary)]">
                            +{dayCategories.length - MAX_DAY_ICONS}
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Tooltip on hover */}
                  {isHovered && showEvents && (
                    <div
                      aria-hidden
                      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[200px] max-w-[260px] bg-white border border-[color:var(--border-default)] rounded-xl shadow-2xl p-3 pointer-events-none"
                    >
                      <div className="text-xs font-semibold text-[color:var(--text-secondary)] mb-1.5 first-letter:uppercase">
                        {dayLabel}
                      </div>
                      <div className="space-y-1.5">
                        {dayEvents.map((e, j) => {
                          const Icon = CATEGORY_ICONS[e.category]
                          return (
                            <div key={`${e.id}-${j}`} className="flex items-start gap-2">
                              <Icon className={cn('w-3.5 h-3.5 mt-px shrink-0', CATEGORY_STYLES[e.category].text)} />
                              <span className="text-xs text-[color:var(--text-secondary)]">
                                <span className={cn('font-semibold', CATEGORY_STYLES[e.category].text)}>
                                  {CATEGORY_LABELS[e.category]}:
                                </span>{' '}
                                {e.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-600" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
            Toca un día para ver qué vence y el enlace para resolverlo.
          </p>

          {/* Selected date detail */}
          {selectedDate && (
            <div className="mt-5 border-t border-[color:var(--border-default)] pt-5">
              <h3 className="text-sm font-semibold text-[color:var(--text-emerald-700)] mb-3 flex items-center gap-2 first-letter:uppercase">
                <CalendarIcon className="w-4 h-4 text-amber-500" aria-hidden />
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-[color:var(--text-tertiary)]">
                  <CalendarIcon className="w-8 h-8 mb-2 opacity-40" aria-hidden />
                  <p className="text-sm">Sin eventos para esta fecha</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedEvents.map((e) => {
                    const Icon = CATEGORY_ICONS[e.category]
                    const action = getEventAction(e)
                    return (
                      <li
                        key={e.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border',
                          CATEGORY_STYLES[e.category].bg,
                          CATEGORY_STYLES[e.category].border,
                        )}
                      >
                        <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', CATEGORY_STYLES[e.category].text)} aria-hidden />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', CATEGORY_STYLES[e.category].badge)}>
                              {CATEGORY_LABELS[e.category]}
                            </span>
                            <p className={cn('text-sm font-semibold', CATEGORY_STYLES[e.category].text)}>
                              {e.title}
                            </p>
                          </div>
                          <p className="text-xs text-[color:var(--text-tertiary)] mt-1">{e.description}</p>
                          {e.law && (
                            <p className="text-[10px] text-[color:var(--text-tertiary)] mt-1 flex items-center gap-1">
                              <Shield className="w-3 h-3" aria-hidden />
                              {e.law}
                            </p>
                          )}
                          {action && (
                            <Button asChild size="xs" variant="emerald-soft" className="mt-2.5">
                              <Link href={action.href}>
                                {action.label}
                                <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────── */}
        <div className="space-y-5">
          {/* Upcoming events */}
          <div className="bg-white backdrop-blur-sm rounded-2xl border border-[color:var(--border-default)] shadow-xl p-5">
            <h3 className="text-sm font-semibold text-[color:var(--text-emerald-700)] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" aria-hidden />
              Próximos 30 días
              {upcomingEvents.length > 0 && (
                <span className="ml-auto text-xs font-normal text-slate-500">
                  {upcomingEvents.length} evento{upcomingEvents.length === 1 ? '' : 's'}
                </span>
              )}
            </h3>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-[color:var(--text-tertiary)]">
                <CalendarIcon className="w-6 h-6 mb-2 opacity-40" aria-hidden />
                <p className="text-xs">Sin eventos próximos</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((e) => {
                  const Icon = CATEGORY_ICONS[e.category]
                  const action = getEventAction(e)
                  const eventDate = new Date(e.date + 'T12:00:00')
                  const diffMs = eventDate.getTime() - new Date(todayStr + 'T12:00:00').getTime()
                  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

                  return (
                    <li
                      key={e.id}
                      className="rounded-xl border border-[color:var(--border-default)]/40 hover:border-[color:var(--border-default)] hover:bg-[color:var(--neutral-100)]/30 transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date(e.date + 'T12:00:00')
                          setCurrentMonth(d.getMonth())
                          setCurrentYear(d.getFullYear())
                          setSelectedDate(e.date)
                        }}
                        className={cn('w-full text-left flex items-start gap-3 p-3 rounded-xl', action && 'pb-1.5')}
                      >
                        <div className={cn('p-1.5 rounded-lg', CATEGORY_STYLES[e.category].bg)}>
                          <Icon className={cn('w-4 h-4', CATEGORY_STYLES[e.category].text)} aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[color:var(--text-emerald-700)] truncate">{e.title}</p>
                          <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                            <span className={cn('font-medium', CATEGORY_STYLES[e.category].text)}>
                              {CATEGORY_LABELS[e.category]}
                            </span>
                            {' · '}
                            {eventDate.toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {' · '}
                            <span className={cn(
                              diffDays === 0 && 'text-amber-400 font-semibold',
                              diffDays === 1 && 'text-amber-400',
                              diffDays <= 7 && diffDays > 1 && 'text-orange-400',
                            )}>
                              {diffDays === 0
                                ? 'Hoy'
                                : diffDays === 1
                                  ? 'Mañana'
                                  : `En ${diffDays} días`}
                            </span>
                          </p>
                        </div>
                      </button>
                      {action && (
                        <Link
                          href={action.href}
                          className="ml-[3.25rem] mb-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline-offset-4 hover:underline"
                        >
                          {action.label}
                          <ArrowRight className="w-3 h-3" aria-hidden />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* RRHH Key dates info card */}
          <div className="bg-white backdrop-blur-sm rounded-2xl border border-[color:var(--border-default)] shadow-xl p-5">
            <h3 className="text-sm font-semibold text-[color:var(--text-emerald-700)] mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" aria-hidden />
              Fechas clave de RRHH
            </h3>
            <ul className="space-y-3 text-xs">
              {KEY_DATES.map((k) => {
                const Icon = CATEGORY_ICONS[k.category]
                const action = resolveCalendarEventAction({ category: k.category })
                return (
                  <li key={k.category} className="flex items-start gap-2.5">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', CATEGORY_STYLES[k.category].text)} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[color:var(--text-secondary)]">{k.title}</p>
                      <p className="text-[color:var(--text-tertiary)]">{k.when}</p>
                      {action && (
                        <Link
                          href={action.href}
                          className="mt-1 inline-flex items-center gap-1 font-semibold text-emerald-700 underline-offset-4 hover:underline"
                        >
                          {action.label}
                          <ArrowRight className="w-3 h-3" aria-hidden />
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Legend */}
          <div className="bg-white backdrop-blur-sm rounded-2xl border border-[color:var(--border-default)] shadow-xl p-5">
            <h3 className="text-sm font-semibold text-[color:var(--text-emerald-700)] mb-3">Qué significa cada ícono</h3>
            <ul className="space-y-2.5">
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => {
                const Icon = CATEGORY_ICONS[cat]
                return (
                  <li key={cat} className="flex items-center gap-2.5">
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', CATEGORY_STYLES[cat].bg)}>
                      <Icon className={cn('w-3.5 h-3.5', CATEGORY_STYLES[cat].text)} aria-hidden />
                    </span>
                    <span className="text-xs text-[color:var(--text-tertiary)]">{CATEGORY_LABELS[cat]}</span>
                  </li>
                )
              })}
              <li className="border-t border-[color:var(--border-default)] pt-2 mt-2 flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center">
                  <span className="w-3 h-3 rounded-full ring-2 ring-amber-500 bg-transparent" aria-hidden />
                </span>
                <span className="text-xs text-[color:var(--text-tertiary)]">Día actual</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
