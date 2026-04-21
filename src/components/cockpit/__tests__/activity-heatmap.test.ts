import { describe, it, expect } from 'vitest'
import { mockHeatmapData } from '@/components/cockpit/activity-heatmap'

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
    const today = new Date().toISOString().slice(0, 10)
    expect(data.some((d) => d.date === today)).toBe(true)
  })
})
