import { getLimaParts } from '@/lib/time/lima'

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getNextCtsCutDate(now = new Date()): Date {
  const lima = getLimaParts(now)
  const today = lima.year * 10_000 + lima.month * 100 + lima.day
  const may15 = lima.year * 10_000 + 5 * 100 + 15
  const nov15 = lima.year * 10_000 + 11 * 100 + 15

  if (today <= may15) return limaMidnightUtc(lima.year, 5, 15)
  if (today <= nov15) return limaMidnightUtc(lima.year, 11, 15)
  return limaMidnightUtc(lima.year + 1, 5, 15)
}

function limaMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0))
}
