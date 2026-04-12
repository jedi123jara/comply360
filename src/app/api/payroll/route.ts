/**
 * /api/payroll
 *
 * GET ?periodo=YYYY-MM  — Resumen de planilla para un período:
 *   lista trabajadores activos + estado de su boleta (generada / pendiente)
 *   con totales agregados.
 *
 * POST { periodo: "YYYY-MM" }  — Generación masiva:
 *   crea boletas para todos los trabajadores activos que aún no tienen boleta
 *   para ese período. Devuelve conteos de generadas, saltadas y errores.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'

// ─── GET /api/payroll ────────────────────────────────────────────────────────

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get('periodo') ?? ''

  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json(
      { error: 'El parámetro "periodo" es requerido en formato YYYY-MM' },
      { status: 400 },
    )
  }

  const orgId = ctx.orgId

  // Load all active workers
  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dni: true,
      position: true,
      department: true,
      regimenLaboral: true,
      tipoAporte: true,
      afpNombre: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
    },
  })

  // Load existing payslips for this period
  const payslips = await prisma.payslip.findMany({
    where: { orgId, periodo },
    select: {
      id: true,
      workerId: true,
      totalIngresos: true,
      totalDescuentos: true,
      netoPagar: true,
      aporteAfpOnp: true,
      rentaQuintaCat: true,
      essalud: true,
      status: true,
    },
  })

  const payslipByWorker = new Map(payslips.map(p => [p.workerId, p]))

  // Aggregate totals
  let totalMasaSalarial = 0
  let totalDescuentos = 0
  let totalNeto = 0
  let totalEssalud = 0
  let totalAfpOnp = 0
  let totalRenta5ta = 0
  let pendientesCount = 0
  let generadasCount = 0

  const rows = workers.map(w => {
    const payslip = payslipByWorker.get(w.id)
    if (payslip) {
      generadasCount++
      totalMasaSalarial += Number(payslip.totalIngresos)
      totalDescuentos += Number(payslip.totalDescuentos)
      totalNeto += Number(payslip.netoPagar)
      totalEssalud += Number(payslip.essalud ?? 0)
      totalAfpOnp += Number(payslip.aporteAfpOnp ?? 0)
      totalRenta5ta += Number(payslip.rentaQuintaCat ?? 0)
    } else {
      pendientesCount++
    }

    return {
      worker: {
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        dni: w.dni,
        position: w.position,
        department: w.department,
        regimenLaboral: w.regimenLaboral,
        tipoAporte: w.tipoAporte,
        sueldoBruto: Number(w.sueldoBruto),
      },
      payslip: payslip
        ? {
            id: payslip.id,
            totalIngresos: Number(payslip.totalIngresos),
            totalDescuentos: Number(payslip.totalDescuentos),
            netoPagar: Number(payslip.netoPagar),
            aporteAfpOnp: Number(payslip.aporteAfpOnp ?? 0),
            rentaQuintaCat: Number(payslip.rentaQuintaCat ?? 0),
            essalud: Number(payslip.essalud ?? 0),
            status: payslip.status,
          }
        : null,
    }
  })

  return NextResponse.json({
    periodo,
    totalWorkers: workers.length,
    generadas: generadasCount,
    pendientes: pendientesCount,
    totales: {
      masaSalarial: round(totalMasaSalarial),
      descuentos: round(totalDescuentos),
      neto: round(totalNeto),
      essalud: round(totalEssalud),
      afpOnp: round(totalAfpOnp),
      renta5ta: round(totalRenta5ta),
      costoTotalEmpleador: round(totalMasaSalarial + totalEssalud),
    },
    rows,
  })
})

// ─── POST /api/payroll — Generación masiva ───────────────────────────────────

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()
  const { periodo, soloFaltantes = true } = body as {
    periodo: string
    soloFaltantes?: boolean
  }

  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json(
      { error: 'El campo "periodo" es requerido en formato YYYY-MM' },
      { status: 400 },
    )
  }

  const [, mmStr] = periodo.split('-')
  const mes = parseInt(mmStr, 10)

  // Load all active workers
  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
  })

  if (workers.length === 0) {
    return NextResponse.json({ error: 'No hay trabajadores activos' }, { status: 404 })
  }

  // Find workers that already have a boleta for this period
  const existingPayslips = await prisma.payslip.findMany({
    where: { orgId, periodo },
    select: { workerId: true },
  })
  const workerIdsWithPayslip = new Set(existingPayslips.map(p => p.workerId))

  // Renta 5ta acumulada por trabajador en el año
  const year = periodo.split('-')[0]
  const prevRetenciones = await prisma.payslip.groupBy({
    by: ['workerId'],
    where: {
      orgId,
      periodo: { startsWith: year, lt: periodo },
    },
    _sum: { rentaQuintaCat: true },
  })
  const rentaAcumuladaMap = new Map(
    prevRetenciones.map(r => [r.workerId, Number(r._sum.rentaQuintaCat ?? 0)]),
  )

  // Process each worker
  const results = {
    generated: 0,
    skipped: 0,
    errors: [] as { workerId: string; name: string; error: string }[],
  }

  for (const worker of workers) {
    // Skip if already has boleta and soloFaltantes=true
    if (soloFaltantes && workerIdsWithPayslip.has(worker.id)) {
      results.skipped++
      continue
    }

    try {
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
        retencionRentaAcumulada: rentaAcumuladaMap.get(worker.id) ?? 0,
      }

      const boleta = calcularBoleta(boletaInput)

      // Upsert payslip (create or update if regenerating)
      await prisma.payslip.upsert({
        where: { workerId_periodo: { workerId: worker.id, periodo } },
        create: {
          orgId,
          workerId: worker.id,
          periodo,
          fechaEmision: new Date(),
          sueldoBruto: boleta.sueldoBruto,
          asignacionFamiliar: boleta.asignacionFamiliar || null,
          horasExtras: boleta.horasExtras || null,
          bonificaciones: boleta.bonificaciones || null,
          totalIngresos: boleta.totalIngresos,
          aporteAfpOnp: boleta.aporteAfpOnp || null,
          rentaQuintaCat: boleta.rentaQuintaCat || null,
          otrosDescuentos: null,
          totalDescuentos: boleta.totalDescuentos,
          netoPagar: boleta.netoPagar,
          essalud: boleta.essalud || null,
          detalleJson: boleta.detalleJson,
          status: 'EMITIDA',
        },
        update: {
          fechaEmision: new Date(),
          sueldoBruto: boleta.sueldoBruto,
          totalIngresos: boleta.totalIngresos,
          totalDescuentos: boleta.totalDescuentos,
          netoPagar: boleta.netoPagar,
          aporteAfpOnp: boleta.aporteAfpOnp || null,
          rentaQuintaCat: boleta.rentaQuintaCat || null,
          essalud: boleta.essalud || null,
          detalleJson: boleta.detalleJson,
          status: 'EMITIDA',
        },
      })

      results.generated++
    } catch (e) {
      results.errors.push({
        workerId: worker.id,
        name: `${worker.firstName} ${worker.lastName}`,
        error: e instanceof Error ? e.message : 'Error desconocido',
      })
    }
  }

  return NextResponse.json(results, { status: 200 })
})

function round(n: number) {
  return Math.round(n * 100) / 100
}
