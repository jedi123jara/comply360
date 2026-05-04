import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Plan Anual SST — Ley 29783 Art. 38
//
// Persistencia en SstRecord type=PLAN_ANUAL con un payload estructurado.
// =============================================

const actividadSchema = z.object({
  id: z.string(),
  titulo: z.string().min(3).max(200),
  area: z.enum([
    'IPERC',
    'CAPACITACION',
    'INSPECCION',
    'EMO',
    'SIMULACRO',
    'AUDITORIA',
    'COMITE',
    'OTRO',
  ]),
  mes: z.number().int().min(1).max(12),
  responsable: z.string().max(150).optional().nullable(),
  estado: z.enum(['PENDIENTE', 'EN_CURSO', 'COMPLETADA']).default('PENDIENTE'),
  notas: z.string().max(500).optional().nullable(),
})

const planSchema = z.object({
  ano: z.number().int().min(2024).max(2030),
  objetivos: z.array(z.string().min(3).max(300)).max(20),
  actividades: z.array(actividadSchema).max(200),
  presupuestoSoles: z.number().min(0).max(100_000_000).nullable().optional(),
})

// =============================================
// GET /api/sst/plan-anual?ano=2026
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const anoStr = searchParams.get('ano') ?? new Date().getFullYear().toString()
  const ano = parseInt(anoStr, 10)
  if (!Number.isFinite(ano)) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const record = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: String(ano) },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    ano,
    existe: !!record,
    plan: record?.data ?? null,
    recordId: record?.id ?? null,
    updatedAt: record?.updatedAt ?? null,
  })
})

// =============================================
// POST /api/sst/plan-anual — crear/actualizar
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = planSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const existing = await prisma.sstRecord.findFirst({
    where: { orgId: ctx.orgId, type: 'PLAN_ANUAL', title: String(data.ano) },
  })

  let record
  if (existing) {
    record = await prisma.sstRecord.update({
      where: { id: existing.id },
      data: {
        description: `Plan Anual SST ${data.ano}`,
        data: data as never,
        status: 'IN_PROGRESS',
      },
    })
  } else {
    record = await prisma.sstRecord.create({
      data: {
        orgId: ctx.orgId,
        type: 'PLAN_ANUAL',
        title: String(data.ano),
        description: `Plan Anual SST ${data.ano}`,
        data: data as never,
        status: 'IN_PROGRESS',
      },
    })
  }

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.plan-anual.saved',
        entityType: 'SstRecord',
        entityId: record.id,
        metadataJson: {
          ano: data.ano,
          actividades: data.actividades.length,
        },
      },
    })
    .catch(() => undefined)

  return NextResponse.json({ recordId: record.id, ano: data.ano })
})
