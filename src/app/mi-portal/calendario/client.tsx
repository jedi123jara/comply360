'use client'

/**
 * CalendarioWorkerClient — Vista personal del calendario para workers.
 *
 * Layout mobile-first (workers leen desde celular):
 *   - Header: "Mi calendario"
 *   - Lista "Próximos 30 días" (vista principal en mobile)
 *   - Vista mensual compacta debajo
 *
 * Cada evento es clickeable → si tiene href, navega; sino abre detalle inline.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon, Loader2, Clock, AlertTriangle,
  Cake, Award, Sparkles, Bell, FileSignature, GraduationCap, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkerEvent {
  id: string
  title: string
  date: string
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'PROBATION_END' | 'VACATION' | 'ACK_DEADLINE' | 'CAPACITACION' | 'ALERT'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  href?: string
}

const TYPE_STYLES: Record<WorkerEvent['type'], { bg: string; text: string; icon: typeof CalendarIcon }> = {
  BIRTHDAY: { bg: 'bg-pink-100', text: 'text-pink-700', icon: Cake },
  ANNIVERSARY: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', icon: Award },
  PROBATION_END: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: Clock },
  VACATION: { bg: 'bg-teal-100', text: 'text-teal-700', icon: Sparkles },
  ACK_DEADLINE: { bg: 'bg-violet-100', text: 'text-violet-700', icon: FileSignature },
  CAPACITACION: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: GraduationCap },
  ALERT: { bg: 'bg-rose-100', text: 'text-rose-700', icon: Bell },
}

const PRIORITY_STYLES: Record<WorkerEvent['priority'], string> = {
  critical: 'border-rose-400 bg-rose-50/50',
  high: 'border-amber-400 bg-amber-50/50',
  medium: 'border-slate-200 bg-white',
  low: 'border-slate-200 bg-white',
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAYS_HEADER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarioWorkerClient() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const [events, setEvents] = useState<WorkerEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  useEffect(() => {
    setLoading(true)
    fetch('/api/mi-portal/calendar')
      .then((r) => r.json())
      .then((d: { data?: WorkerEvent[] }) => setEvents(d.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  // Próximos 30 días
  const upcoming = useMemo(() => {
    if (!events) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return events
      .filter((e) => e.date >= todayStr && e.date <= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20)
  }, [events, todayStr])

  // Eventos por día (para grilla mensual)
  const byDate = useMemo(() => {
    const map = new Map<string, WorkerEvent[]>()
    if (!events) return map
    for (const e of events) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    return map
  }, [events])

  // Grid del mes
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const cells: { day: number; inMonth: boolean; dateStr: string }[] = []
  for (let i = 0; i < startOffset; i++) cells.push({ day: 0, inMonth: false, dateStr: '' })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, inMonth: true, dateStr })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}
        >
          Mi <em className="text-emerald-700">calendario</em>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Tus vacaciones, capacitaciones, plazos de firma y eventos personales.
        </p>
      </div>

      {/* Próximos 30 días — vista principal mobile */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          Próximos 30 días
          <span className="ml-auto text-xs font-normal text-slate-500">
            {upcoming.length} {upcoming.length === 1 ? 'evento' : 'eventos'}
          </span>
        </h2>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No tienes eventos próximos. ¡Todo en orden!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => {
              const style = TYPE_STYLES[e.type]
              const Icon = style.icon
              const eventDate = new Date(e.date + 'T12:00:00')
              const diffDays = Math.round(
                (eventDate.getTime() - new Date(todayStr + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24),
              )
              const dateLabel = diffDays === 0
                ? 'Hoy'
                : diffDays === 1
                  ? 'Mañana'
                  : diffDays <= 7
                    ? `En ${diffDays} días`
                    : eventDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })

              const Wrapper: React.ElementType = e.href ? Link : 'div'
              const wrapperProps: React.ComponentPropsWithoutRef<'div'> & { href?: string } = e.href
                ? { href: e.href }
                : {}

              return (
                <Wrapper
                  key={e.id}
                  {...wrapperProps}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border transition-all',
                    PRIORITY_STYLES[e.priority],
                    e.href && 'hover:shadow-md hover:border-emerald-300 cursor-pointer',
                  )}
                >
                  <div className={cn('shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', style.bg)}>
                    <Icon className={cn('w-4 h-4', style.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{e.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">{e.description}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-xs font-bold px-2 py-1 rounded-md',
                      e.priority === 'critical' && 'bg-rose-100 text-rose-700',
                      e.priority === 'high' && 'bg-amber-100 text-amber-700',
                      e.priority === 'medium' && 'bg-slate-100 text-slate-700',
                      e.priority === 'low' && 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {dateLabel}
                  </span>
                </Wrapper>
              )
            })}
          </div>
        )}
      </section>

      {/* Vista mensual compacta */}
      <section className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            {MONTHS_ES[currentMonth]} {currentYear}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11)
                  setCurrentYear((y) => y - 1)
                } else setCurrentMonth((m) => m - 1)
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0)
                  setCurrentYear((y) => y + 1)
                } else setCurrentMonth((m) => m + 1)
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_HEADER.map((d) => (
            <div key={d} className="text-[10px] font-semibold text-slate-500 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const dayEvents = c.dateStr ? byDate.get(c.dateStr) ?? [] : []
            const isToday = c.dateStr === todayStr
            return (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-lg p-1 text-center text-xs flex flex-col items-center justify-start',
                  c.inMonth ? 'border border-slate-100' : '',
                  isToday && 'ring-2 ring-emerald-500 bg-emerald-50',
                )}
              >
                {c.inMonth && (
                  <>
                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        isToday ? 'text-emerald-700 font-bold' : 'text-slate-700',
                      )}
                    >
                      {c.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={cn('w-1 h-1 rounded-full', TYPE_STYLES[e.type].text.replace('text-', 'bg-'))}
                            title={e.title}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer help */}
      <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Solo verás eventos personales (los tuyos). Los plazos de la empresa (CTS, gratificación, etc.) los
          gestiona tu empleador.
        </p>
      </div>
    </div>
  )
}
