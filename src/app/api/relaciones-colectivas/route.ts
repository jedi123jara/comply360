import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { z } from 'zod'

const VALID_TYPES = ['SINDICATO', 'CONVENIO_COLECTIVO', 'NEGOCIACION', 'PLIEGO_RECLAMOS', 'FUERO_SINDICAL', 'HUELGA'] as const
const VALID_STATUS = ['ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED', 'CLOSED'] as const

const CreateSchema = z.object({
  type: z.enum(VALID_TYPES),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(VALID_STATUS).default('ACTIVE'),
  data: z.record(z.string(), z.unknown()).optional(),
})

const UpdateSchema = CreateSchema.partial().extend({
  id: z.string(),
})

// =============================================
// GET /api/relaciones-colectivas
// =============================================
export const GET = withAuth(async (_req, ctx) => {
  const records = await prisma.sindicalRecord.findMany({
    where: { orgId: ctx.orgId },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
  })

  const total = records.length
  const activeUnions = records.filter(r => r.type === 'SINDICATO' && r.status === 'ACTIVE').length
  const activeConvenios = records.filter(r => r.type === 'CONVENIO_COLECTIVO' && r.status === 'ACTIVE').length
  const ongoingNeg = records.filter(r => r.type === 'NEGOCIACION' && r.status === 'ACTIVE').length
  const openPliego = records.filter(r => r.type === 'PLIEGO_RECLAMOS' && r.status === 'ACTIVE').length

  const now = new Date()
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const expiringSoon = records.filter(r => {
    if (!r.endDate) return false
    return r.endDate > now && r.endDate <= in90 && r.status === 'ACTIVE'
  })

  return NextResponse.json({
    records,
    stats: { total, activeUnions, activeConvenios, ongoingNeg, openPliego },
    expiringSoon,
  })
})

// =============================================
// POST /api/relaciones-colectivas
// =============================================
export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: jsonData, startDate, endDate, ...rest } = parsed.data

  const record = await prisma.sindicalRecord.create({
    data: {
      orgId: ctx.orgId,
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ...(jsonData !== undefined ? { data: jsonData as unknown as never } : {}),
    },
  })

  return NextResponse.json({ record }, { status: 201 })
})

// =============================================
// PUT /api/relaciones-colectivas
// =============================================
export const PUT = withAuth(async (req, ctx) => {
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { id, data: jsonData, startDate, endDate, ...rest } = parsed.data
  const existing = await prisma.sindicalRecord.findFirst({ where: { id, orgId: ctx.orgId } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const record = await prisma.sindicalRecord.update({
    where: { id },
    data: {
      ...rest,
      startDate: startDate !== undefined
        ? (startDate ? new Date(startDate) : null)
        : undefined,
      endDate: endDate !== undefined
        ? (endDate ? new Date(endDate) : null)
        : undefined,
      ...(jsonData !== undefined ? { data: jsonData as unknown as never } : {}),
    },
  })

  return NextResponse.json({ record })
})

// =============================================
// DELETE /api/relaciones-colectivas?id=xxx
// =============================================
export const DELETE = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const existing = await prisma.sindicalRecord.findFirst({ where: { id, orgId: ctx.orgId } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.sindicalRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
