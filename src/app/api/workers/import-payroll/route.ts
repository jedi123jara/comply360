import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { parsePlameExcel, type PlameRow } from '@/lib/import/plame-parser'
import type { AuthContext } from '@/lib/auth'

const importLimiter = rateLimit({ interval: 60_000, limit: 5 })

// =============================================
// POST — Parse PLAME Excel → return preview + token
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await importLimiter.check(req)
  if (!rl.success) return rl.response!

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos Excel (.xlsx, .xls)' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo excede el tamaño máximo de 20MB' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const { rows, workerCount, periodStart, periodEnd, errors } = parsePlameExcel(buffer)

    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: errors[0] }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron registros válidos en el archivo' }, { status: 400 })
    }

    // Check which DNIs exist in this org
    const uniqueDnis = [...new Set(rows.map(r => r.dni))]
    const existingWorkers = await prisma.worker.findMany({
      where: { orgId: ctx.orgId, dni: { in: uniqueDnis } },
      select: { id: true, dni: true, firstName: true, lastName: true },
    })
    const dniToWorker = new Map(existingWorkers.map(w => [w.dni, w]))

    const foundDnis   = uniqueDnis.filter(d => dniToWorker.has(d))
    const missingDnis = uniqueDnis.filter(d => !dniToWorker.has(d))

    // Rows that can be imported (worker exists in org)
    const importableRows = rows.filter(r => dniToWorker.has(r.dni))

    // Build importToken (encode rows + orgId)
    const tokenData = {
      orgId: ctx.orgId,
      rows: importableRows.map(r => ({
        ...r,
        workerId: dniToWorker.get(r.dni)!.id,
      })),
      timestamp: Date.now(),
    }
    const importToken = Buffer.from(JSON.stringify(tokenData)).toString('base64')

    return NextResponse.json({
      preview: {
        totalRows: rows.length,
        importableRows: importableRows.length,
        workerCount,
        foundWorkers: foundDnis.length,
        missingWorkers: missingDnis.length,
        missingDnis: missingDnis.slice(0, 10),
        periodStart,
        periodEnd,
        errors,
      },
      importToken,
    })
  } catch (error) {
    console.error('[import-payroll POST]', error)
    return NextResponse.json({ error: 'Error al procesar el archivo' }, { status: 500 })
  }
})

// =============================================
// PUT — Confirm import → bulk upsert Payslips
// =============================================
export const PUT = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const rl = await importLimiter.check(req)
  if (!rl.success) return rl.response!

  try {
    const { importToken } = await req.json() as { importToken: string }
    if (!importToken) return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 })

    let tokenData: {
      orgId: string
      timestamp: number
      rows: (PlameRow & { workerId: string })[]
    }

    try {
      tokenData = JSON.parse(Buffer.from(importToken, 'base64').toString('utf-8'))
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    if (tokenData.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Token no corresponde a esta organización' }, { status: 403 })
    }
    if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Token expirado. Suba el archivo nuevamente.' }, { status: 410 })
    }

    const { rows } = tokenData
    if (!rows?.length) return NextResponse.json({ error: 'No hay registros para importar' }, { status: 400 })

    // Upsert payslips in batches of 100
    let created = 0
    let updated = 0
    const BATCH = 100

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(r => {
          const mm = String(r.month).padStart(2, '0')
          const periodo = `${r.year}-${mm}`

          const detalleJson = {
            sueldoBasico:        r.sueldoBasico,
            asignacionFamiliar:  r.asignacionFamiliar,
            gratificacion:       r.gratificacion,
            bonificacionExtraord: r.bonificacionExtraord,
            otrosIngresos:       r.otrosIngresos,
            descuentoONP:        r.descuentoONP,
            descuentoAFP:        r.descuentoAFP,
            comisionAFP:         r.comisionAFP,
            seguroAFP:           r.seguroAFP,
            rentaQuinta:         r.rentaQuinta,
            otrosDescuentos:     r.otrosDescuentos,
            essalud:             r.essalud,
            ctsDeposito:         r.ctsDeposito ?? 0,
            tipoAporte:          r.tipoAporte,
            cargo:               r.cargo,
            area:                r.area,
            esResumenAnual:      r.noMesColumn ?? false,
          }

          return prisma.payslip.upsert({
            where: { workerId_periodo: { workerId: r.workerId, periodo } },
            update: {
              sueldoBruto:       r.sueldoBasico,
              asignacionFamiliar: r.asignacionFamiliar > 0 ? r.asignacionFamiliar : null,
              bonificaciones:    (r.gratificacion + r.bonificacionExtraord) || null,
              totalIngresos:     r.totalIngresos,
              aporteAfpOnp:      (r.descuentoONP + r.descuentoAFP + r.comisionAFP + r.seguroAFP) || null,
              rentaQuintaCat:    r.rentaQuinta || null,
              totalDescuentos:   r.totalDescuentos,
              netoPagar:         r.netoPagar,
              essalud:           r.essalud || null,
              detalleJson,
              status:            'EMITIDA',
            },
            create: {
              orgId:             ctx.orgId,
              workerId:          r.workerId,
              periodo,
              fechaEmision:      new Date(r.year, r.month - 1, 1),
              sueldoBruto:       r.sueldoBasico,
              asignacionFamiliar: r.asignacionFamiliar > 0 ? r.asignacionFamiliar : null,
              bonificaciones:    (r.gratificacion + r.bonificacionExtraord) || null,
              totalIngresos:     r.totalIngresos,
              aporteAfpOnp:      (r.descuentoONP + r.descuentoAFP + r.comisionAFP + r.seguroAFP) || null,
              rentaQuintaCat:    r.rentaQuinta || null,
              totalDescuentos:   r.totalDescuentos,
              netoPagar:         r.netoPagar,
              essalud:           r.essalud || null,
              detalleJson,
              status:            'EMITIDA',
            },
          }).then(r => ({ op: 'upsert' as const, r }))
        })
      )

      for (const res of results) {
        if (res.status === 'fulfilled') {
          created++ // upsert always counts as success
        }
      }
      updated = 0 // upsert handles both
    }

    return NextResponse.json({
      message: `Se importaron ${created} boletas de pago exitosamente`,
      imported: created,
      updated,
      total: rows.length,
    })
  } catch (error) {
    console.error('[import-payroll PUT]', error)
    return NextResponse.json({ error: 'Error al guardar el historial de pagos' }, { status: 500 })
  }
})
