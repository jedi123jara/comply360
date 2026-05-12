'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { complianceScoreColor } from '@/lib/brand'

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

  function cellColor(value: number) {
    if (value <= 0) return 'rgba(148, 163, 184, 0.12)'
    if (value === 1) return 'rgba(20, 184, 166, 0.28)'
    if (value === 2) return 'rgba(20, 184, 166, 0.46)'
    if (value === 3) return 'rgba(45, 212, 191, 0.72)'
    return 'rgb(103, 232, 249)'
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
                className="h-[11px] w-3 text-[9px] text-[color:var(--text-tertiary)] text-right pr-1 leading-[11px]"
              >
                {i % 2 === 0 ? d : ''}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="inline-flex gap-[3px]" role="img" aria-label="Actividad de compliance">
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => (
                    <span
                      key={di}
                      title={day ? `${day.date}${day.count != null ? ` · ${day.count} acciones` : ''}` : ''}
                      className={cn(
                        'h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-125 hover:ring-1 hover:ring-emerald-500/60'
                      )}
                      style={{ background: cellColor(day?.value ?? 0) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[color:var(--text-tertiary)]">
          <span>Menos</span>
          {[0, 1, 2, 3, 4].map((v) => (
            <span
              key={v}
              className="h-[10px] w-[10px] rounded-[2px]"
              style={{ background: cellColor(v), color: complianceScoreColor(80) }}
            />
          ))}
          <span>Más</span>
        </div>
      </CardContent>
    </Card>
  )
}
