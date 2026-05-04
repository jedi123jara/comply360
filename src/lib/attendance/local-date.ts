const DEFAULT_TIME_ZONE = 'America/Lima'

function partsFor(date: Date, timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
  }
}

export function localDateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  const { year, month, day } = partsFor(date, timeZone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function workDateFor(date = new Date(), timeZone = DEFAULT_TIME_ZONE): Date {
  const key = localDateKey(date, timeZone)
  return new Date(`${key}T00:00:00.000Z`)
}

export function localDayRange(dateKey: string, timeZone = DEFAULT_TIME_ZONE): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Fecha invalida: ${dateKey}`)
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  const start = zonedLocalMidnightToUtc(year, month, day, timeZone)
  const nextLocal = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0))
  const nextParts = partsFor(nextLocal, timeZone)
  const nextStart = zonedLocalMidnightToUtc(nextParts.year, nextParts.month, nextParts.day, timeZone)

  return {
    start,
    end: new Date(nextStart.getTime() - 1),
  }
}

function zonedLocalMidnightToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const offset = timeZoneOffsetMinutes(guess, timeZone)
  return new Date(guess.getTime() - offset * 60_000)
}

export function localDateTimeToUtc(
  dateKey: string,
  hour: number,
  minute = 0,
  timeZone = DEFAULT_TIME_ZONE,
): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Fecha invalida: ${dateKey}`)
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Hora invalida: ${hour}:${minute}`)
  }
  const [year, month, day] = dateKey.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = timeZoneOffsetMinutes(guess, timeZone)
  return new Date(guess.getTime() - offset * 60_000)
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour') % 24,
    value('minute'),
    value('second'),
  )
  return (asUtc - date.getTime()) / 60_000
}

export function attendanceLockKey(orgId: string, workerId: string, workDate: Date): string {
  return `${orgId}:${workerId}:${workDate.toISOString().slice(0, 10)}`
}
