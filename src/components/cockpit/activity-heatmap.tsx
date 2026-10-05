'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * ActivityHeatmap — GitHub-style contribution graph for compliance activity.
 *
 * Replaces the legacy placeholder at `src/components/dashboard/activity-heatmap.tsx`.
 *
 * `data` is a flat array of { date, value (0-4 intensity) }. The component
 * lays out by ISO week × day of week. 12 weeks (~3 months) shown.
 */

export interface HeatmapDay {
  date: string // ISO date (YYYY-MM-DD)
  value: number // 0-4 intensity
  count?: number // optional raw count for tooltips
}

interface ActivityHeatmapProps {
  data: HeatmapDay[]
  weeks?: number
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * Niveles de intensidad con nombre: cada celda lleva su valor en texto
 * (title + aria-label) y la leyenda los nombra, para no depender del color
 * (WCAG 1.4.1).
 */
const LEVEL_LABELS = ['Sin actividad', 'Baja', 'Media', 'Alta', 'Muy alta'] as const

/**
 * Rampa monótona sobre fondo claro: a más acciones, más oscuro. La anterior
 * terminaba en cian claro (rgb(103,232,249)), así que el nivel 4 se veía más
 * claro que el 3 en el tema claro.
 */
function cellColor(value: number) {
  if (value <= 0) return 'rgba(148, 163, 184, 0.16)'
  if (value === 1) return 'rgba(13, 148, 136, 0.22)'
  if (value === 2) return 'rgba(13, 148, 136, 0.45)'
  if (value === 3) return 'rgba(13, 148, 136, 0.72)'
  return 'rgb(15, 118, 110)'
}

function levelLabel(value: number) {
  return LEVEL_LABELS[Math.max(0, Math.min(4, Math.round(value)))]
}

// Formato fijo (no Intl): el texto sale igual en el servidor y en el navegador
// y no rompe la hidratación.
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

/** "lun 5 oct 2026: 3 acciones (alta)" — texto de cada celda. */
function describeDay(day: HeatmapDay) {
  const d = new Date(`${day.date}T00:00:00Z`)
  const fecha = `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  const nivel = levelLabel(day.value).toLowerCase()
  if (day.count != null) {
    return `${fecha}: ${day.count} ${day.count === 1 ? 'acción' : 'acciones'} (${nivel})`
  }
  return day.value <= 0 ? `${fecha}: sin actividad` : `${fecha}: actividad ${nivel}`
}

export function ActivityHeatmap({ data, weeks = 12 }: ActivityHeatmapProps) {
  // Build a date → value map
  const map = new Map<string, HeatmapDay>()
  for (const d of data) map.set(d.date, d)

  // Build a 7 × weeks grid ending on the newest server-provided date. Avoid
  // using "now" during SSR so the server/client trees hydrate identically.
  const anchorDate = data.reduce<string | null>(
    (latest, d) => (!latest || d.date > latest ? d.date : latest),
    null,
  ) ?? '2026-01-01'
  const today = new Date(`${anchorDate}T12:00:00`)
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = (today.getDay() + 6) % 7 // Monday=0 … Sunday=6
  const daysTotal = weeks * 7

  const grid: (HeatmapDay | null)[][] = []
  for (let w = 0; w < weeks; w++) grid.push(Array(7).fill(null))

  for (let i = 0; i < daysTotal; i++) {
    const offset = daysTotal - 1 - i - dayOfWeek
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const iso = date.toISOString().slice(0, 10)
    const hit = map.get(iso)
    const col = Math.floor(i / 7)
    const row = i % 7
    grid[col][row] = hit ?? { date: iso, value: 0 }
  }

  const totalActivity = data.reduce((sum, d) => sum + (d.count ?? d.value), 0)

  return (
    <Card padding="none" className="motion-fade-in-up">
      <CardHeader>
        <div>
          <CardTitle>Actividad de compliance</CardTitle>
          <CardDescription>Últimas {weeks} semanas — mientras más oscuro, más acciones.</CardDescription>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Acciones
          </p>
          <p className="text-2xl font-bold tracking-tight">{totalActivity}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {/* Weekday labels */}
          <div className="flex flex-col gap-[3px] pt-[22px]">
            {WEEKDAYS.map((d, i) => (
              <span
                key={i}
                className="h-[11px] w-3 text-[11px] text-[color:var(--text-tertiary)] text-right pr-1 leading-[11px]"
              >
                {i % 2 === 0 ? d : ''}
              </span>
            ))}
          </div>

          {/* Grid: cada celda lleva su valor en texto (title + aria-label) */}
          <div className="flex-1 overflow-x-auto">
            <div
              className="inline-flex gap-[3px]"
              role="group"
              aria-label={`Actividad de compliance de las últimas ${weeks} semanas: ${totalActivity} acciones`}
            >
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const label = day ? describeDay(day) : ''
                    return (
                      <span
                        key={di}
                        role="img"
                        aria-label={label}
                        title={label}
                        className={cn(
                          'h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 hover:ring-1 hover:ring-emerald-500/60'
                        )}
                        style={{ background: cellColor(day?.value ?? 0) }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leyenda con texto: cada tono tiene su nombre */}
        <ul
          className="mt-3 flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[10px] text-[color:var(--text-tertiary)]"
          aria-label="Leyenda de intensidad"
        >
          {LEVEL_LABELS.map((name, v) => (
            <li key={name} className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-[10px] w-[10px] rounded-[2px] border border-[color:var(--border-subtle)]"
                style={{ background: cellColor(v) }}
              />
              {name}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
