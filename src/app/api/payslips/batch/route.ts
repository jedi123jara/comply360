import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { hasMinRole } from '@/lib/api-auth'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularBoleta, type BoletaInput } from '@/lib/legal-engine/calculators/boleta'
import { payslipBatchSchema } from '@/lib/workers/schemas'

// =============================================
// POST /api/payslips/batch — Generate payslips for multiple workers
// Body: { periodo: "2026-04", workerIds?: string[] }
// =============================================
export const POST = withPlanGate('workers', async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN' }, { status: 403 })
  }

  const orgId = ctx.orgId
  const body = await req.json().catch(() => ({}))

  // Validación zod: periodo (YYYY-MM) + workerIds (array de strings, opcional).
  // Antes workerIds llegaba crudo a `{ id: { in: workerIds } }` y un valor que
  // no fuera array de strings reventaba Prisma con 500.
  const parsed = payslipBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { periodo, workerIds } = parsed.data

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
  const loadedWorkerIds = workers.map((w) => w.id)
  const existingPayslips = await prisma.payslip.findMany({
    where: { orgId, periodo, workerId: { in: loadedWorkerIds } },
    select: { workerId: true },
  })
  const existingSet = new Set(existingPayslips.map(p => p.workerId))

  const [, mmStr] = periodo.split('-')
  const mes = parseInt(mmStr, 10)
  const year = periodo.split('-')[0]

  // FIX N+1: precargar TODAS las boletas previas del año (de todos los workers) en
  // UNA query y agrupar la renta 5ta acumulada por workerId, en vez de hacer una
  // query por trabajador dentro del bucle.
  const priorPayslips = await prisma.payslip.findMany({
    where: { orgId, workerId: { in: loadedWorkerIds }, periodo: { startsWith: year, lt: periodo } },
    select: { workerId: true, rentaQuintaCat: true },
  })
  const retencionByWorker = new Map<string, number>()
  for (const p of priorPayslips) {
    retencionByWorker.set(p.workerId, (retencionByWorker.get(p.workerId) ?? 0) + Number(p.rentaQuintaCat ?? 0))
  }

  let skipped = 0
  const errors: { workerId: string; workerName: string; error: string }[] = []
  const toCreate: Prisma.PayslipCreateManyInput[] = []

  // Process in batch (cómputo en memoria; persistencia en un único createMany).
  for (const worker of workers) {
    if (existingSet.has(worker.id)) {
      skipped++
      continue
    }

    try {
      const retencionAcumulada = retencionByWorker.get(worker.id) ?? 0

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
        periodo,
        retencionRentaAcumulada: retencionAcumulada,
      }

      const result = calcularBoleta(boletaInput)

      toCreate.push({
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
      })
    } catch (err) {
      errors.push({
        workerId: worker.id,
        workerName: `${worker.firstName} ${worker.lastName}`,
        error: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  }

  // FIX N+1: una sola escritura batch en vez de un create por trabajador.
  let created = 0
  if (toCreate.length > 0) {
    const res = await prisma.payslip.createMany({ data: toCreate })
    created = res.count
  }

  return NextResponse.json({
    periodo,
    total: workers.length,
    created,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
})

