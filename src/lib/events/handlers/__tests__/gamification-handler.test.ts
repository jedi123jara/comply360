/**
 * Tests de la lógica pura del gamification-handler.
 *
 * No cubrimos la llamada a Prisma — eso se verifica mejor en integration
 * tests con una DB real. Acá nos enfocamos en `computeNextStreak`, la
 * parte que tiene toda la complejidad (timezone Lima + edge cases).
 */

import { describe, expect, it } from 'vitest'
import { computeNextStreak } from '../gamification-handler'

describe('computeNextStreak', () => {
  it('inicio: sin streak previo → current=1, longest=1', () => {
    const now = new Date('2026-04-23T15:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 0, streakLongest: 0, streakLastAt: null },
      now,
    )
    expect(next.streakCurrent).toBe(1)
    expect(next.streakLongest).toBe(1)
    expect(next.streakLastAt).toEqual(now)
  })

  it('mismo día Lima: no modifica streakCurrent', () => {
    const earlier = new Date('2026-04-23T13:00:00Z') // 08:00 Lima
    const later = new Date('2026-04-23T22:00:00Z') // 17:00 Lima mismo día
    const next = computeNextStreak(
      { streakCurrent: 5, streakLongest: 5, streakLastAt: earlier },
      later,
    )
    expect(next.streakCurrent).toBe(5)
    expect(next.streakLongest).toBe(5)
    expect(next.streakLastAt).toEqual(later)
  })

  it('gap de 1 día Lima: incrementa en 1', () => {
    const yesterday = new Date('2026-04-22T15:00:00Z')
    const today = new Date('2026-04-23T15:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 3, streakLongest: 3, streakLastAt: yesterday },
      today,
    )
    expect(next.streakCurrent).toBe(4)
    expect(next.streakLongest).toBe(4)
  })

  it('gap de 2 días Lima: resetea a 1', () => {
    const twoAgo = new Date('2026-04-21T15:00:00Z')
    const today = new Date('2026-04-23T15:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 10, streakLongest: 10, streakLastAt: twoAgo },
      today,
    )
    expect(next.streakCurrent).toBe(1)
    expect(next.streakLongest).toBe(10) // longest preservado
  })

  it('gap de 5 días: reset pero longest se mantiene', () => {
    const old = new Date('2026-04-18T15:00:00Z')
    const today = new Date('2026-04-23T15:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 7, streakLongest: 15, streakLastAt: old },
      today,
    )
    expect(next.streakCurrent).toBe(1)
    expect(next.streakLongest).toBe(15)
  })

  it('streakLongest solo se actualiza si el nuevo streak es mayor', () => {
    const yesterday = new Date('2026-04-22T15:00:00Z')
    const today = new Date('2026-04-23T15:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 5, streakLongest: 20, streakLastAt: yesterday },
      today,
    )
    expect(next.streakCurrent).toBe(6)
    expect(next.streakLongest).toBe(20) // no bajamos longest
  })

  it('frontera UTC: instante 02:00 UTC del día siguiente es mismo día Lima', () => {
    // 2026-04-23 21:00 Lima = 2026-04-24 02:00 UTC
    // 2026-04-23 08:00 Lima = 2026-04-23 13:00 UTC
    // Ambos son el MISMO día Lima → no incrementa
    const earlier = new Date('2026-04-23T13:00:00Z')
    const later = new Date('2026-04-24T02:00:00Z')
    const next = computeNextStreak(
      { streakCurrent: 4, streakLongest: 4, streakLastAt: earlier },
      later,
    )
    expect(next.streakCurrent).toBe(4) // no cambia
  })

  it('frontera UTC: 05:00 UTC es el inicio del día Lima', () => {
    // 2026-04-23 04:59 UTC = 2026-04-22 23:59 Lima (día 22)
    // 2026-04-23 05:01 UTC = 2026-04-23 00:01 Lima (día 23)
    // Gap de 1 día Lima → incrementa
    const lastNight = new Date('2026-04-23T04:59:00Z') // día 22 Lima
    const thisMorning = new Date('2026-04-23T05:01:00Z') // día 23 Lima
    const next = computeNextStreak(
      { streakCurrent: 2, streakLongest: 2, streakLastAt: lastNight },
      thisMorning,
    )
    expect(next.streakCurrent).toBe(3)
  })
})
