import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { localDateKey, localDateTimeToUtc, workDateFor } from '@/lib/attendance/local-date'

export interface AbsenceGenerationResult {
  orgId: string
  date: string
  workersScanned: number
  absencesCreated: number
  skippedExisting: number
  skippedNonBusinessDay: boolean
}

export function previousLocalDateKey(now = new Date()): string {
  const today = localDateKey(now)
  const [year, month, day] = today.split('-').map(Number)
  const previous = new Date(Date.UTC(year, month - 1, day - 1, 12))
  return previous.toISOString().slice(0, 10)
}

export function isDefaultBusinessDay(dateKey: string): boolean {
  const [year, month, day] = dateKey.split('-').map(Number)
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

export async function generateAbsencesForOrg(input: {
  orgId: string
  dateKey?: string
  skipWeekends?: boolean
}): Promise<AbsenceGenerationResult> {
  const dateKey = input.dateKey ?? previousLocalDateKey()
  const skipWeekends = input.skipWeekends ?? true
  const skippedNonBusinessDay = skipWeekends && !isDefaultBusinessDay(dateKey)
  if (skippedNonBusinessDay) {
    return {
      orgId: input.orgId,
      date: dateKey,
      workersScanned: 0,
      absencesCreated: 0,
      skippedExisting: 0,
      skippedNonBusinessDay: true,
    }
  }

  const workDate = workDateFor(localDateTimeToUtc(dateKey, 12))
  const workers = await prisma.worker.findMany({
    where: {
      orgId: input.orgId,
      status: 'ACTIVE',
      deletedAt: null,
      fechaIngreso: { lte: localDateTimeToUtc(dateKey, 23, 59) },
    },
    select: {
      id: true,
      expectedClockInHour: true,
      expectedClockInMinute: true,
    },
  })

  let absencesCreated = 0
  let skippedExisting = 0

  for (const worker of workers) {
    const absentAt = localDateTimeToUtc(
      dateKey,
      worker.expectedClockInHour,
      worker.expectedClockInMinute,
    )
    try {
      await prisma.attendance.create({
        data: {
          orgId: input.orgId,
          workerId: worker.id,
          workDate,
          clockIn: absentAt,
          status: 'ABSENT',
          notes: JSON.stringify({
            n: 'Ausencia generada automáticamente al cierre del día laboral.',
          }),
        },
      })
      absencesCreated++
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        skippedExisting++
        continue
      }
      throw err
    }
  }

  return {
    orgId: input.orgId,
    date: dateKey,
    workersScanned: workers.length,
    absencesCreated,
    skippedExisting,
    skippedNonBusinessDay: false,
  }
}
