import { describe, expect, it } from 'vitest'
import { getNextCtsCutDate, toIsoDate } from '../cts-cutoffs'

describe('CTS cutoffs', () => {
  it('keeps May 15 as the next cutoff during May 15 in Lima', () => {
    const cut = getNextCtsCutDate(new Date('2026-05-15T17:00:00.000Z'))

    expect(toIsoDate(cut)).toBe('2026-05-15')
    expect(cut.toISOString()).toBe('2026-05-15T05:00:00.000Z')
  })

  it('moves to November after May 15 in Lima', () => {
    const cut = getNextCtsCutDate(new Date('2026-05-16T13:00:00.000Z'))

    expect(toIsoDate(cut)).toBe('2026-11-15')
  })

  it('uses Lima calendar year at UTC year boundaries', () => {
    const cut = getNextCtsCutDate(new Date('2027-01-01T04:00:00.000Z'))

    expect(toIsoDate(cut)).toBe('2027-05-15')
  })
})
