'use client'

/**
 * CalendarWidget — mini-widget del calendario unificado para el cockpit.
 *
 * Fetcha próximos 5 eventos del calendario unificado y los muestra como
 * lista compacta. Click en un evento → navega a su entityHref si tiene,
 * sino a /dashboard/calendario al día específico.
 *
 * Diseño: card compacto que cabe junto a otras tarjetas del Bento Grid.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar as CalendarIcon, Clock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CalendarApiEvent {
  id: string
  title: string
  date: string
  type: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
}

const TYPE_COLOR: Record<string, string> = {
  LEGAL: 'bg-blue-50 text-blue-700 ring-blue-200',
  CONTRACT: 'bg-orange-50 text-orange-700 ring-orange-200',
  SST: 'bg-amber-50 text-amber-700 ring-amber-200',
  BIRTHDAY: 'bg-pink-50 text-pink-700 ring-pink-200',
  ALERT: 'bg-rose-50 text-rose-700 ring-rose-200',
  WORKER_ANNIVERSARY: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
  PROBATION_END: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  VACATION: 'bg-sky-50 text-sky-700 ring-sky-200',
  ACK_DEADLINE: 'bg-violet-50 text-violet-700 ring-violet-200',
  CAPACITACION: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
}

const TYPE_LABEL: Record<string, string> = {
  LEGAL: 'Legal',
  CONTRACT: 'Contrato',
  SST: 'SST',
  BIRTHDAY: 'Cumple',
  ALERT: 'Alerta',
  WORKER_ANNIVERSARY: 'Aniversario',
  PROBATION_END: 'Período prueba',
  VACATION: 'Vacaciones',
  ACK_DEADLINE: 'Plazo firma',
  CAPACITACION: 'Capacitación',
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarApiEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    fetch(`/api/calendar?year=${today.getFullYear()}&month=${today.getMonth()}`)
      .then((r) => r.json())
      .then((d: { data?: CalendarApiEvent[] }) => {
        // Filtrar próximos 30 días, top 5 por proximidad
        const todayStr = today.toISOString().split('T')[0]
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + 30)
        const cutoffStr = cutoff.toISOString().split('T')[0]
        const upcoming = (d.data ?? [])
          .filter((e) => e.date >= todayStr && e.date <= cutoffStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5)
        setEvents(upcoming)
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card padding="lg" className="motion-fade-in-up flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <Card padding="lg" className="motion-fade-in-up">
        <div className="flex flex-col items-center text-center py-4 gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-semibold">Próximos 30 días despejados</p>
          <p className="text-xs text-[color:var(--text-tertiary)] max-w-xs">
            No hay eventos relevantes. Te avisaremos cuando algo necesite atención.
          </p>
          <Link
            href="/dashboard/calendario"
            className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Ver calendario completo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </Card>
    )
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <Card padding="none" className="motion-fade-in-up">
      <CardHeader>
        <div>
          <CardTitle>
            <CalendarIcon className="inline w-4 h-4 mr-1.5 -mt-0.5 text-emerald-600" />
            Próximos eventos
          </CardTitle>
          <CardDescription>Top 5 de tu calendario unificado.</CardDescription>
        </div>
        <Link
          href="/dashboard/calendario"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="!p-0">
        <ul className="divide-y divide-[color:var(--border-subtle)]">
          {events.map((e) => {
            const eventDate = new Date(e.date + 'T12:00:00')
            const diffDays = Math.round(
              (eventDate.getTime() - new Date(todayStr + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24),
            )
            const dateLabel = diffDays === 0
              ? 'Hoy'
              : diffDays === 1
                ? 'Mañana'
                : diffDays <= 7
                  ? `En ${diffDays}d`
                  : eventDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })

            const colorClass = TYPE_COLOR[e.type] ?? 'bg-slate-50 text-slate-700 ring-slate-200'
            const typeLabel = TYPE_LABEL[e.type] ?? e.type

            return (
              <li key={e.id}>
                <Link
                  href="/dashboard/calendario"
                  className="flex items-center gap-3 px-6 py-3 hover:bg-[color:var(--neutral-50)] transition-colors"
                >
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 shrink-0',
                      colorClass,
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded ring-1', colorClass)}>
                        {typeLabel}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          diffDays === 0 ? 'text-rose-700' : diffDays <= 3 ? 'text-amber-700' : 'text-slate-600',
                        )}
                      >
                        {dateLabel}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
