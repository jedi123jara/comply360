import { describe, expect, it } from 'vitest'
import { localDateKey, localDateTimeToUtc, localDayRange, workDateFor } from '../local-date'

describe('attendance local-date helpers', () => {
  it('deriva fecha Lima aunque UTC ya sea el dia siguiente', () => {
    const utcNight = new Date('2026-05-05T02:30:00.000Z')
    expect(localDateKey(utcNight)).toBe('2026-05-04')
    expect(workDateFor(utcNight).toISOString()).toBe('2026-05-04T00:00:00.000Z')
  })

  it('calcula rango UTC de un dia Lima', () => {
    const range = localDayRange('2026-05-04')
    expect(range.start.toISOString()).toBe('2026-05-04T05:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-05-05T04:59:59.999Z')
  })

  it('rechaza formatos ambiguos', () => {
    expect(() => localDayRange('04/05/2026')).toThrow(/Fecha invalida/)
  })

  it('convierte una hora local Lima a UTC', () => {
    expect(localDateTimeToUtc('2026-05-04', 8, 15).toISOString()).toBe('2026-05-04T13:15:00.000Z')
  })
})
