import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Memoria Anual SST — rendición de cuentas anual del SGSST.
// Ley 29783 + R.M. 050-2013-TR.
//
// Persistido en SstRecord type=PLAN_ANUAL con title="memoria-{YEAR}" para
// evitar nueva migración. El plan original usa title="{YEAR}".
// =============================================

const defaultIndicadores = {
  accidentesMortales: 0,
  accidentesNoMortales: 0,
  incidentesPeligrosos: 0,
  enfermedadesOcupacionales: 0,
  diasPerdidos: 0,
  indiceFrecuencia: 0,
  indiceGravedad: 0,
  indiceAccidentabilidad: 0,
  capacitacionesRealizadas: 0,
  capacitacionesPlanificadas: 0,
  simulacrosRealizados: 0,
  visitasFieldAudit: 0,
}

const memoriaSchema = z.object({
  ano: z.number().int().min(2024).max(2030),
  resumenEjecutivo: z.string().max(5000).optional().nullable(),
  cumplimientoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  indicadores: z
    .object({
      accidentesMortales: z.number().int().min(0).default(0),
      accidentesNoMortales: z.number().int().min(0).default(0),
      incidentesPeligrosos: z.number().int().min(0).default(0),
      enfermedadesOcupacionales: z.number().int().min(0).default(0),
      diasPerdidos: z.number().int().min(0).default(0),
      indiceFrecuencia: z.number().min(0).default(0),
      indiceGravedad: z.number().min(0).default(0),
      indiceAccidentabilidad: z.number().min(0).default(0),
      capacitacionesRealizadas: z.number().int().min(0).default(0),
      capacitacionesPlanificadas: z.number().int().min(0).default(0),
      simulacrosRealizados: z.number().int().min(0).default(0),
      visitasFieldAudit: z.number().int().min(0).default(0),
    })
    .default(defaultIndicadores),
  cumplimientoActividades: z
    .array(
      z.object({
        actividad: z.string().min(3).max(200),
        planificada: z.boolean(),
        ejecutada: z.boolean(),
        observaciones: z.string().max(500).optional().nullable(),
      }),
    )
    .max(200)
    .default([]),
  conclusiones: z.string().max(5000).optional().nullable(),
  recomendacionesProximoAno: z.array(z.string().min(3).max(300)).max(20).default([]),
})

const memoriaTitle = (ano: number) => `memoria-${ano}`

// =============================================
// GET /api/sst/memoria-anual?ano=2026
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') ?? new Date().getFullYear().toString(), 10)
  if (!Number.isFinite(ano)) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  // Cargar memoria si existe
  const memoria = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: memoriaTitle(ano) },
    orderBy: { updatedAt: 'desc' },
  })

  // Cargar plan anual del mismo año (para comparar planificado vs ejecutado)
  const plan = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: String(ano) },
    orderBy: { updatedAt: 'desc' },
  })

  // Auto-calcular indicadores reales del año
  const yearStart = new Date(`${ano}-01-01T00:00:00.000Z`)
  const yearEnd = new Date(`${ano + 1}-01-01T00:00:00.000Z`)

  const [accidentes, visitas, workersActivos] = await Promise.all([
    prisma.accidente.findMany({
      where: { orgId: ctx.orgId, fechaHora: { gte: yearStart, lt: yearEnd } },
      select: { tipo: true },
    }),
    prisma.visitaFieldAudit.count({
      where: {
        orgId: ctx.orgId,
        estado: 'CERRADA',
        fechaProgramada: { gte: yearStart, lt: yearEnd },
      },
    }),
    prisma.worker.count({ where: { orgId: ctx.orgId, status: 'ACTIVE' } }),
  ])

  const accidentesPorTipo = accidentes.reduce(
    (acc, a) => {
      acc[a.tipo] = (acc[a.tipo] ?? 0) + 1
      return acc
    },
    { MORTAL: 0, NO_MORTAL: 0, INCIDENTE_PELIGROSO: 0, ENFERMEDAD_OCUPACIONAL: 0 } as Record<
      string,
      number
    >,
  )

  // Indicadores OIT estándar (simplificados, asumiendo 200,000 horas/año por 100 trabajadores)
  const horasHombre = workersActivos * 2000 // 50 semanas × 40h
  const totalAccidentes = accidentesPorTipo.MORTAL + accidentesPorTipo.NO_MORTAL
  const indiceFrecuencia =
    horasHombre > 0 ? (totalAccidentes * 1_000_000) / horasHombre : 0

  const computedIndicadores = {
    accidentesMortales: accidentesPorTipo.MORTAL ?? 0,
    accidentesNoMortales: accidentesPorTipo.NO_MORTAL ?? 0,
    incidentesPeligrosos: accidentesPorTipo.INCIDENTE_PELIGROSO ?? 0,
    enfermedadesOcupacionales: accidentesPorTipo.ENFERMEDAD_OCUPACIONAL ?? 0,
    visitasFieldAudit: visitas,
    indiceFrecuencia: Math.round(indiceFrecuencia * 100) / 100,
  }

  return NextResponse.json({
    ano,
    existe: !!memoria,
    memoria: memoria?.data ?? null,
    plan: plan?.data ?? null,
    recordId: memoria?.id ?? null,
    updatedAt: memoria?.updatedAt ?? null,
    indicadoresAutomaticos: computedIndicadores,
    workersActivos,
  })
})

// =============================================
// POST /api/sst/memoria-anual — crear/actualizar
// =============================================
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = memoriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const existing = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: memoriaTitle(data.ano) },
  })

  let record
  if (existing) {
    record = await prisma.sstRecord.update({
      where: { id: existing.id },
      data: {
        description: `Memoria Anual SST ${data.ano}`,
        data: data as never,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })
  } else {
    record = await prisma.sstRecord.create({
      data: {
        orgId: ctx.orgId,
        type: 'PLAN_ANUAL',
        title: memoriaTitle(data.ano),
        description: `Memoria Anual SST ${data.ano}`,
        data: data as never,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })
  }

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.memoria-anual.saved',
        entityType: 'SstRecord',
        entityId: record.id,
        metadataJson: { ano: data.ano },
      },
    })
    .catch(() => undefined)

  return NextResponse.json({ recordId: record.id, ano: data.ano })
})
