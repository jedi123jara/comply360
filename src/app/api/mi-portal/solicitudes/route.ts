import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { emit } from '@/lib/events'

/**
 * Remueve tags internos como `[doc:cv]` de la descripcion antes de mostrar al
 * trabajador. El tag se usa internamente por la cascada de onboarding para
 * deduplicar solicitudes; no debe verse en la UI.
 */
function stripInternalTags(desc: string | null): string | null {
  if (!desc) return desc
  return desc.replace(/\s*\[doc:[a-z_]+\]\s*$/i, '').trim() || null
}

const REQUEST_TYPES = [
  'VACACIONES',
  'PERMISO',
  'LICENCIA_MEDICA',
  'LICENCIA_MATERNIDAD',
  'LICENCIA_PATERNIDAD',
  'ADELANTO_SUELDO',
  'CTS_RETIRO_PARCIAL',
  'CONSTANCIA_TRABAJO',
  'CERTIFICADO_5TA',
  'ACTUALIZAR_DATOS',
  'OTRO',
] as const

const createSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: z.string().min(3).max(120),
  description: z.string().max(1000).nullable().optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  amount: z.number().positive().optional(),
})

export const GET = withWorkerAuth(async (_req, ctx) => {
  const requests = await prisma.workerRequest.findMany({
    where: { workerId: ctx.workerId, orgId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      title: r.title,
      description: stripInternalTags(r.description),
      startDate: r.startDate?.toISOString() || null,
      endDate: r.endDate?.toISOString() || null,
      daysRequested: r.daysRequested,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewNotes: r.reviewNotes,
      createdAt: r.createdAt.toISOString(),
    })),
  })
})

export const POST = withWorkerAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { type, title, description, startDate, endDate, amount } = parsed.data

  let daysRequested: number | null = null
  let parsedStart: Date | null = null
  let parsedEnd: Date | null = null

  if (startDate && endDate) {
    parsedStart = new Date(startDate)
    parsedEnd = new Date(endDate)
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Fechas invalidas' }, { status: 400 })
    }
    if (parsedEnd < parsedStart) {
      return NextResponse.json({ error: 'La fecha fin no puede ser anterior al inicio' }, { status: 400 })
    }
    daysRequested = Math.ceil((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const created = await prisma.workerRequest.create({
    data: {
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      type,
      status: 'PENDIENTE',
      title,
      description: description || null,
      startDate: parsedStart,
      endDate: parsedEnd,
      daysRequested,
      amount: amount ? amount : null,
    },
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'worker.request.created',
      entityType: 'WorkerRequest',
      entityId: created.id,
      metadataJson: { type, title },
    },
  }).catch(() => null)

  // Event bus: permite a RRHH engancharse con workflows de aprobación
  emit('worker_request.created', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    requestId: created.id,
    workerId: ctx.workerId,
    type: created.type,
    title: created.title,
  })

  return NextResponse.json({
    id: created.id,
    type: created.type,
    status: created.status,
    title: created.title,
    description: created.description,
    startDate: created.startDate?.toISOString() || null,
    endDate: created.endDate?.toISOString() || null,
    daysRequested: created.daysRequested,
    createdAt: created.createdAt.toISOString(),
  }, { status: 201 })
})
