import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAttendanceReportPDF } from '@/lib/attendance/report-pdf'
import { withAuth } from '@/lib/api-auth'

/**
 * GET /api/attendance/report — Reporte de asistencia
 *
 * Modos según query params:
 *   - format=pdf + workerId + startDate + endDate
 *     → Libro Digital de Asistencia (R.M. 037-2024-TR Anexo 1) en PDF
 *   - default JSON (summary por trabajador) + startDate + endDate (+ department)
 */
export const GET = withAuth(async (req: NextRequest, ctx) => {
  const orgId = ctx.orgId
  const url = new URL(req.url)
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const department = url.searchParams.get('department')
  const format = url.searchParams.get('format')
  const workerId = url.searchParams.get('workerId')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate y endDate son requeridos (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  // ── Modo PDF: Libro Digital R.M. 037-2024-TR ──────────────────────
  if (format === 'pdf') {
    if (!workerId) {
      return NextResponse.json(
        { error: 'workerId es requerido cuando format=pdf' },
        { status: 400 },
      )
    }
    try {
      const start = new Date(`${startDate}T00:00:00.000Z`)
      const end = new Date(`${endDate}T00:00:00.000Z`)

      const [org, worker, records] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true, razonSocial: true, ruc: true },
        }),
        prisma.worker.findFirst({
          where: { id: workerId, orgId },
          select: {
            firstName: true, lastName: true, dni: true, position: true,
            department: true, fechaIngreso: true,
            expectedClockInHour: true, expectedClockInMinute: true,
            expectedClockOutHour: true, expectedClockOutMinute: true,
            lateToleranceMinutes: true,
          },
        }),
        prisma.attendance.findMany({
          where: { orgId, workerId, workDate: { gte: start, lte: end } },
          select: {
            clockIn: true, clockOut: true, status: true, hoursWorked: true,
            isOvertime: true, overtimeMinutes: true, notes: true,
          },
          orderBy: { workDate: 'asc' },
        }),
      ])
      if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
      if (!worker) return NextResponse.json({ error: 'Trabajador no encontrado en esta organización' }, { status: 404 })

      const buffer = await generateAttendanceReportPDF({
        org,
        worker,
        periodStart: start,
        periodEnd: end,
        records: records.map(r => ({
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          status: r.status,
          hoursWorked: r.hoursWorked != null ? Number(r.hoursWorked) : null,
          isOvertime: r.isOvertime,
          overtimeMinutes: r.overtimeMinutes,
          notes: r.notes,
        })),
      })

      const filename = `libro-asistencia_${worker.lastName}_${startDate}_${endDate}.pdf`
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    } catch (error) {
      console.error('[attendance/report PDF] Error:', error)
      return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
    }
  }

  try {
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T00:00:00.000Z`)

    const where: Record<string, unknown> = {
      orgId,
      workDate: { gte: start, lte: end },
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
})
