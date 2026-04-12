import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'

// =============================================
// POST /api/payslips/batch — Generate payslips for multiple workers
// Body: { periodo: "2026-04", workerIds?: string[] }
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN' }, { status: 403 })
  }

  const orgId = ctx.orgId
  const body = await req.json()
  const { periodo, workerIds } = body as {
    periodo: string
    workerIds?: string[]
  }

  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'El campo "periodo" debe tener formato YYYY-MM' }, { status: 400 })
  }

  // Load target workers
  const workers = await prisma.worker.findMany({
    where: {
      orgId,
      status: 'ACTIVE',
      ...(workerIds?.length ? { id: { in: workerIds } } : {}),
    },
    select: {
      id: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
      tipoAporte: true,
      afpNombre: true,
      sctr: true,
      regimenLaboral: true,
      firstName: true,
      lastName: true,
    },
  })

  if (workers.length === 0) {
    return NextResponse.json({ error: 'No hay trabajadores activos para generar boletas' }, { status: 400 })
  }

  // Find existing payslips for this period to skip duplicates
  const existingPayslips = await prisma.payslip.findMany({
    where: { orgId, periodo, workerId: { in: workers.map(w => w.id) } },
    select: { workerId: true },
  })
  const existingSet = new Set(existingPayslips.map(p => p.workerId))

  const [, mmStr] = periodo.split('-')
  const mes = parseInt(mmStr, 10)
  const year = periodo.split('-')[0]

  let created = 0
  let skipped = 0
  const errors: { workerId: string; workerName: string; error: string }[] = []

  // Process in batch
  for (const worker of workers) {
    if (existingSet.has(worker.id)) {
      skipped++
      continue
    }

    try {
      // Sum prior renta 5ta
      const prevPayslips = await prisma.payslip.findMany({
        where: { workerId: worker.id, orgId, periodo: { startsWith: year, lt: periodo } },
        select: { rentaQuintaCat: true },
      })
      const retencionAcumulada = prevPayslips.reduce(
        (sum, p) => sum + Number(p.rentaQuintaCat ?? 0),
        0,
      )

      const boletaInput: BoletaInput = {
        sueldoBruto: Number(worker.sueldoBruto),
        asignacionFamiliar: worker.asignacionFamiliar,
        tipoAporte: worker.tipoAporte as 'AFP' | 'ONP' | 'SIN_APORTE',
        afpNombre: worker.afpNombre ?? undefined,
        sctr: worker.sctr,
        regimenLaboral: worker.regimenLaboral,
        horasExtras: 0,
        bonificaciones: 0,
        incluirGratificacion: mes === 7 || mes === 12,
        mes,
        retencionRentaAcumulada: retencionAcumulada,
      }

      const result = calcularBoleta(boletaInput)

      await prisma.payslip.create({
        data: {
          orgId,
          workerId: worker.id,
          periodo,
          fechaEmision: new Date(),
          sueldoBruto: result.sueldoBruto,
          asignacionFamiliar: result.asignacionFamiliar || null,
          horasExtras: null,
          bonificaciones: null,
          totalIngresos: result.totalIngresos,
          aporteAfpOnp: result.aporteAfpOnp || null,
          rentaQuintaCat: result.rentaQuintaCat || null,
          otrosDescuentos: null,
          totalDescuentos: result.totalDescuentos,
          netoPagar: result.netoPagar,
          essalud: result.essalud || null,
          detalleJson: result.detalleJson,
          status: 'EMITIDA',
        },
      })
      created++
    } catch (err) {
      errors.push({
        workerId: worker.id,
        workerName: `${worker.firstName} ${worker.lastName}`,
        error: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  return NextResponse.json({
    periodo,
    total: workers.length,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
})
