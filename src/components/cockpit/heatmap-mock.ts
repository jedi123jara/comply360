import type { HeatmapDay } from './activity-heatmap'

/**
 * Generate a mock 12-week dataset for demo purposes. Deterministic so
 * screenshots don't drift.
 *
 * Vive en un módulo aparte para evitar que el bundle de producción del
 * cockpit lo arrastre. Sólo lo importan tests y la página /dev/cockpit.
 */
export function mockHeatmapData(weeks = 12): HeatmapDay[] {
  const days: HeatmapDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const seed = d.getDate() * 31 + d.getMonth() * 7 + d.getDay()
    const v = ((seed * 7 + 3) % 9) - 4
    const intensity = Math.max(0, Math.min(4, Math.abs(v)))
    days.push({ date: iso, value: intensity, count: intensity * 3 })
  }
  return days
}
