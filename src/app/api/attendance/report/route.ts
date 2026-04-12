import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/attendance/report — Attendance summary report
 * Query params: startDate, endDate, department
 */
export async function GET(req: NextRequest) {
  const { orgId } = await auth()
  if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const department = url.searchParams.get('department')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate y endDate son requeridos (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  try {
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)

    const where: Record<string, unknown> = {
      orgId,
      clockIn: { gte: start, lte: end },
    }
    if (department) {
      where.worker = { department }
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        worker: { select: { id: true, firstName: true, lastName: true, department: true } },
      },
    })

    // Group by worker
    const byWorker = new Map<string, {
      name: string
      department: string
      daysPresent: number
      daysLate: number
      daysOnLeave: number
      totalHours: number
      avgHoursPerDay: number
    }>()

    for (const r of records) {
      const key = r.workerId
      const existing = byWorker.get(key) || {
        name: `${r.worker.firstName} ${r.worker.lastName}`,
        department: r.worker.department || '',
        daysPresent: 0,
        daysLate: 0,
        daysOnLeave: 0,
        totalHours: 0,
        avgHoursPerDay: 0,
      }

      if (r.status === 'PRESENT') existing.daysPresent++
      if (r.status === 'LATE') existing.daysLate++
      if (r.status === 'ON_LEAVE') existing.daysOnLeave++
      if (r.hoursWorked) existing.totalHours += Number(r.hoursWorked)

      byWorker.set(key, existing)
    }

    // Calculate averages
    for (const [, data] of byWorker) {
      const totalDays = data.daysPresent + data.daysLate
      data.avgHoursPerDay = totalDays > 0 ? Math.round(data.totalHours / totalDays * 10) / 10 : 0
    }

    const summary = {
      period: { startDate, endDate },
      totalRecords: records.length,
      totalPresent: records.filter((r: { status: string }) => r.status === 'PRESENT').length,
      totalLate: records.filter((r: { status: string }) => r.status === 'LATE').length,
      totalOnLeave: records.filter((r: { status: string }) => r.status === 'ON_LEAVE').length,
      punctualityRate: records.length > 0
        ? Math.round(records.filter((r: { status: string }) => r.status === 'PRESENT').length / records.length * 100)
        : 0,
      workers: Array.from(byWorker.entries()).map(([id, data]) => ({ id, ...data })),
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('[attendance/report] Error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
