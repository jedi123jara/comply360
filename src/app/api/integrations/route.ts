import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTRegistroExport, generateTRegistroCSV } from '@/lib/integrations/t-registro'
import { generatePlameExport, generatePlameSummaryCSV } from '@/lib/integrations/plame'
import { withAuth } from '@/lib/api-auth'

// POST /api/integrations — Generate export files
export const POST = withAuth(async (req, ctx) => {
  try {
    const { action, format, periodo } = await req.json()
    const orgId = ctx.orgId

    // Get org info
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      select: { ruc: true },
    })

    const ruc = org?.ruc || '20000000001'

    // Get active workers
    const workers = await prisma.worker.findMany({
      where: { orgId, status: 'ACTIVE' },
      orderBy: { lastName: 'asc' },
    })

    if (workers.length === 0) {
      return NextResponse.json({ error: 'No hay trabajadores activos para exportar' }, { status: 400 })
    }

    if (action === 't-registro') {
      const workerData = workers.map(w => ({
        dni: w.dni,
        firstName: w.firstName,
        lastName: w.lastName,
        birthDate: w.birthDate?.toISOString() || null,
        gender: w.gender,
        nationality: w.nationality,
        address: w.address,
        phone: w.phone,
        email: w.email,
        position: w.position,
        fechaIngreso: w.fechaIngreso.toISOString(),
        fechaCese: w.fechaCese?.toISOString() || null,
        regimenLaboral: w.regimenLaboral,
        tipoContrato: w.tipoContrato,
        sueldoBruto: Number(w.sueldoBruto),
        jornadaSemanal: w.jornadaSemanal,
        tipoAporte: w.tipoAporte,
        afpNombre: w.afpNombre,
        cuspp: w.cuspp,
        sctr: w.sctr,
        essaludVida: w.essaludVida,
      }))

      const content = format === 'csv'
        ? generateTRegistroCSV(workerData)
        : generateTRegistroExport(ruc, workerData)

      const filename = format === 'csv'
        ? `t-registro-${ruc}-${new Date().toISOString().split('T')[0]}.csv`
        : `t-registro-${ruc}-${new Date().toISOString().split('T')[0]}.txt`

      return NextResponse.json({
        content,
        filename,
        workers: workers.length,
        format: format || 'txt',
      })
    }

    if (action === 'plame') {
      const periodoStr = periodo || new Date().toISOString().slice(0, 7).replace('-', '')

      const workerData = workers.map(w => ({
        dni: w.dni,
        firstName: w.firstName,
        lastName: w.lastName,
        regimenLaboral: w.regimenLaboral,
        tipoContrato: w.tipoContrato,
        sueldoBruto: Number(w.sueldoBruto),
        asignacionFamiliar: w.asignacionFamiliar,
        diasTrabajados: 30,
        horasExtras25: 0,
        horasExtras35: 0,
        inasistencias: 0,
        tardanzas: 0,
        tipoAporte: w.tipoAporte,
        afpNombre: w.afpNombre,
        sctr: w.sctr,
      }))

      if (format === 'csv') {
        const content = generatePlameSummaryCSV(ruc, periodoStr, workerData)
        return NextResponse.json({
          content,
          filename: `plame-resumen-${periodoStr}.csv`,
          workers: workers.length,
          format: 'csv',
        })
      }

      const result = generatePlameExport(ruc, periodoStr, workerData)
      return NextResponse.json({
        content: result.content,
        filename: `plame-${ruc}-${periodoStr}.txt`,
        workers: workers.length,
        format: 'txt',
        summary: result.summary,
      })
    }

    return NextResponse.json({ error: 'Accion no valida. Use t-registro o plame.' }, { status: 400 })
  } catch (error) {
    console.error('Integrations API error:', error)
    return NextResponse.json({ error: 'Error al generar exportacion' }, { status: 500 })
  }
})
