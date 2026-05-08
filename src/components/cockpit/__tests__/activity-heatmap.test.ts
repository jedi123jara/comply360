import { describe, it, expect } from 'vitest'
import { mockHeatmapData } from '@/components/cockpit/heatmap-mock'

describe('mockHeatmapData', () => {
  it('genera exactamente weeks * 7 entradas', () => {
    expect(mockHeatmapData(12).length).toBe(12 * 7)
    expect(mockHeatmapData(4).length).toBe(4 * 7)
  })

  it('cada entrada tiene shape { date, value, count }', () => {
    const data = mockHeatmapData(2)
    for (const d of data) {
      expect(typeof d.date).toBe('string')
      expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(typeof d.value).toBe('number')
      expect(d.value).toBeGreaterThanOrEqual(0)
      expect(d.value).toBeLessThanOrEqual(4)
    }
  })

  it('es deterministico: misma llamada = mismo resultado', () => {
    const a = mockHeatmapData(12)
    const b = mockHeatmapData(12)
    expect(a.map((d) => d.value)).toEqual(b.map((d) => d.value))
  })

  it('cubre rango de fechas descendente desde hoy', () => {
    const data = mockHeatmapData(2)
    const dates = data.map((d) => new Date(d.date).getTime()).sort((x, y) => y - x)
    expect(data.map((d) => new Date(d.date).getTime())).toEqual(dates)
  })

  it('contiene dias recientes (dentro del rango esperado)', () => {
    const data = mockHeatmapData(1)
    // mockHeatmapData anchors on local midnight (not UTC now), then serializes
    // to UTC ISO. Mimic that here so the test is stable in any timezone,
    // including when the host is in a timezone that has already rolled over
    // to the next UTC day (e.g. Peru at 22:00 local).
    const anchor = new Date()
    anchor.setHours(0, 0, 0, 0)
    const todayLocal = anchor.toISOString().slice(0, 10)
    expect(data.some((d) => d.date === todayLocal)).toBe(true)
  })
})
