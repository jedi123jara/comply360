import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'
import { calculateLateDeduction } from '@/lib/attendance/late-deduction'

// =============================================
// GET /api/workers/[id]/payslips — list payslips for a worker
// =============================================
export const GET = withPlanGateParams<{ id: string }>('workers', async (
  req: NextRequest,
  ctx: AuthContext,
  params
) => {
  const workerId = params.id

  // Verify worker belongs to this org
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!worker) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })

  const url = new URL(req.url)
  const year = url.searchParams.get('year')
  const limit = parseInt(url.searchParams.get('limit') ?? '120', 10)

  const payslips = await prisma.payslip.findMany({
    where: {
      workerId,
      orgId: ctx.orgId,
      ...(year ? { periodo: { startsWith: year } } : {}),
    },
    orderBy: { periodo: 'desc' },
    take: Math.min(limit, 240),
    select: {
      id: true,
      periodo: true,
      fechaEmision: true,
      sueldoBruto: true,
      asignacionFamiliar: true,
      bonificaciones: true,
      totalIngresos: true,
      aporteAfpOnp: true,
      rentaQuintaCat: true,
      totalDescuentos: true,
      netoPagar: true,
      essalud: true,
      detalleJson: true,
      status: true,
      pdfUrl: true,
    },
  })

  // Group by year for the UI
  const byYear: Record<string, typeof payslips> = {}
  for (const p of payslips) {
    const y = p.periodo.split('-')[0] ?? 'N/A'
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(p)
  }

  return NextResponse.json({ payslips, byYear, total: payslips.length })
})

// =============================================
// POST /api/workers/[id]/payslips — generate a new payslip
// Body: { periodo: "2026-04", horasExtras?, bonificaciones?, incluirGratificacion? }
// =============================================
export const POST = withPlanGateParams<{ id: string }>('workers', async (
  req: NextRequest,
  ctx: AuthContext,
  params
) => {
  const workerId = params.id
  const orgId = ctx.orgId

  // Load worker — select EXPLÍCITO con SOLO los campos que necesitamos para
  // calcularBoleta. Evita SELECT * implícito que truena si alguna columna nueva
  // no existe en DB (caso de migrations no aplicadas).
  let worker
  try {
    worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId },
      select: {
        id: true,
        sueldoBruto: true,
        asignacionFamiliar: true,
        tipoAporte: true,
        afpNombre: true,
        sctr: true,
        regimenLaboral: true,
        jornadaSemanal: true,
        status: true,
        expectedClockInHour: true,
        expectedClockInMinute: true,
        lateToleranceMinutes: true,
      },
    })
  } catch (err) {
    // Las columnas de schedule no existen en DB → reintenta sin esos campos
    console.warn('[payslips/POST] schedule columns missing, retrying without', err instanceof Error ? err.message : err)
    try {
      worker = await prisma.worker.findFirst({
        where: { id: workerId, orgId },
        select: {
          id: true,
          sueldoBruto: true,
          asignacionFamiliar: true,
          tipoAporte: true,
          afpNombre: true,
          sctr: true,
          regimenLaboral: true,
          jornadaSemanal: true,
          status: true,
        },
      }) as typeof worker
    } catch (err2) {
      console.error('[payslips/POST] worker fetch failed', err2 instanceof Error ? err2.message : err2)
      return NextResponse.json(
        {
          error: 'No se pudo cargar el trabajador. La base de datos necesita actualizarse desde /admin/db-sync',
          code: 'DB_SCHEMA_MISMATCH',
          detail: err2 instanceof Error ? err2.message.slice(0, 200) : String(err2),
        },
        { status: 500 },
      )
    }
  }
  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }
  if (worker.status === 'TERMINATED') {
    return NextResponse.json({ error: 'El trabajador está cesado. Use el módulo de liquidaciones.' }, { status: 400 })
  }

  const body = await req.json()
  const { periodo, horasExtras, bonificaciones, incluirGratificacion } = body as {
    periodo: string        // "YYYY-MM"
    horasExtras?: number
    bonificaciones?: number
    incluirGratificacion?: boolean
  }

  // Validate periodo format
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'El campo "periodo" debe tener formato YYYY-MM' }, { status: 400 })
  }

  // Check for duplicate — no two boletas for the same worker × period
  const existing = await prisma.payslip.findFirst({
    where: { workerId, orgId, periodo },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Ya existe una boleta para el período ${periodo}`, payslipId: existing.id },
      { status: 409 },
    )
  }

  // Sum renta 5ta retenida en períodos anteriores del mismo año
  const year = periodo.split('-')[0]
  const prevPayslips = await prisma.payslip.findMany({
    where: {
      workerId,
      orgId,
      periodo: { startsWith: year, lt: periodo },
    },
    select: { rentaQuintaCat: true },
  })
  const retencionAcumulada = prevPayslips.reduce(
    (sum, p) => sum + Number(p.rentaQuintaCat ?? 0),
    0,
  )

  // Build boleta input
  const [, mmStr] = periodo.split('-')
  const mes = parseInt(mmStr, 10)

  // Descuento por tardanzas/ausencias no justificadas del periodo (Fase 4)
  // Si el worker no tiene horario configurado (campos null pre-migration),
  // calculateLateDeduction usa los defaults: 8:00 con 15 min tolerancia.
  let descuentoTardanzasMonto = 0
  let descuentoTardanzasMinutos = 0
  try {
    const lateDeduction = await calculateLateDeduction({
      workerId,
      orgId,
      periodo,
      jornadaSemanal: worker.jornadaSemanal ?? 48,
      sueldoBruto: Number(worker.sueldoBruto),
      expectedClockInHour: worker.expectedClockInHour ?? 8,
      expectedClockInMinute: worker.expectedClockInMinute ?? 0,
      lateToleranceMinutes: worker.lateToleranceMinutes ?? 15,
    })
    descuentoTardanzasMonto = lateDeduction.descuentoMonto
    descuentoTardanzasMinutos = lateDeduction.minutosTardanzaNoJustificada
  } catch (err) {
    console.error('[payslips/POST] late deduction calc failed', err)
    // Si falla, generamos la boleta sin descuento (más seguro que bloquear)
  }

  const boletaInput: BoletaInput = {
    sueldoBruto: Number(worker.sueldoBruto),
    asignacionFamiliar: worker.asignacionFamiliar,
    tipoAporte: worker.tipoAporte as 'AFP' | 'ONP' | 'SIN_APORTE',
    afpNombre: worker.afpNombre ?? undefined,
    sctr: worker.sctr,
    regimenLaboral: worker.regimenLaboral,
    horasExtras: horasExtras ?? 0,
    bonificaciones: bonificaciones ?? 0,
    incluirGratificacion: incluirGratificacion ?? (mes === 7 || mes === 12),
    mes,
    retencionRentaAcumulada: retencionAcumulada,
    descuentoTardanzasMonto,
    descuentoTardanzasMinutos,
  }

  let result
  try {
    result = calcularBoleta(boletaInput)
  } catch (err) {
    console.error('[payslips/POST] calcularBoleta failed', err)
    return NextResponse.json(
      {
        error: 'Error al calcular la boleta. Verifica que el trabajador tenga sueldo, régimen y tipo de aporte definidos.',
        code: 'BOLETA_CALC_ERROR',
        detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
      },
      { status: 500 },
    )
  }

  // Persist payslip
  let payslip
  try {
    payslip = await prisma.payslip.create({
      data: {
        orgId,
        workerId,
        periodo,
        fechaEmision: new Date(),
        sueldoBruto: result.sueldoBruto,
        asignacionFamiliar: result.asignacionFamiliar || null,
        horasExtras: result.horasExtras || null,
        bonificaciones: result.bonificaciones || null,
        totalIngresos: result.totalIngresos,
        aporteAfpOnp: result.aporteAfpOnp || null,
        rentaQuintaCat: result.rentaQuintaCat || null,
        // Descuento por tardanzas/ausencias no justificadas (Fase 4) — usa el
        // campo otrosDescuentos del schema Payslip que ya existía sin uso.
        otrosDescuentos: result.descuentoTardanzas > 0 ? result.descuentoTardanzas : null,
        totalDescuentos: result.totalDescuentos,
        netoPagar: result.netoPagar,
        essalud: result.essalud || null,
        detalleJson: result.detalleJson,
        status: 'EMITIDA',
      },
    })
  } catch (err) {
    console.error('[payslips/POST] payslip.create failed', err)
    return NextResponse.json(
      {
        error: 'No se pudo guardar la boleta. Probablemente la DB necesita actualizarse desde /admin/db-sync',
        code: 'DB_INSERT_ERROR',
        detail: err instanceof Error ? err.message.slice(0, 300) : String(err),
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ payslip, result }, { status: 201 })
})

