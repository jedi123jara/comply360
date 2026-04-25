import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { emit } from '@/lib/events'

const updateSchema = z.object({
  email: z.string().email().or(z.literal('')).nullable().optional(),
  phone: z.string().max(20).or(z.literal('')).nullable().optional(),
  address: z.string().max(200).or(z.literal('')).nullable().optional(),
})

export const GET = withWorkerAuth(async (_req, ctx) => {
  const worker = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    include: { organization: { select: { name: true, ruc: true } } },
  })

  if (!worker) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    firstName: worker.firstName,
    lastName: worker.lastName,
    dni: worker.dni,
    email: worker.email,
    phone: worker.phone,
    birthDate: worker.birthDate?.toISOString() || null,
    gender: worker.gender,
    nationality: worker.nationality,
    address: worker.address,
    position: worker.position,
    department: worker.department,
    fechaIngreso: worker.fechaIngreso.toISOString(),
    regimenLaboral: worker.regimenLaboral,
    tipoContrato: worker.tipoContrato,
    organization: worker.organization,
  })
})

export const PATCH = withWorkerAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, phone, address } = parsed.data

  const updated = await prisma.worker.update({
    where: { id: ctx.workerId },
    data: {
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(address !== undefined && { address: address || null }),
    },
    include: { organization: { select: { name: true, ruc: true } } },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'worker.profile.updated',
      entityType: 'Worker',
      entityId: ctx.workerId,
      metadataJson: { fields: Object.keys(parsed.data) },
    },
  }).catch(() => null)

  // Event bus
  emit('worker.profile.updated', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    workerId: ctx.workerId,
    fieldsChanged: Object.keys(parsed.data),
  })

  return NextResponse.json({
    firstName: updated.firstName,
    lastName: updated.lastName,
    dni: updated.dni,
    email: updated.email,
    phone: updated.phone,
    birthDate: updated.birthDate?.toISOString() || null,
    gender: updated.gender,
    nationality: updated.nationality,
    address: updated.address,
    position: updated.position,
    department: updated.department,
    fechaIngreso: updated.fechaIngreso.toISOString(),
    regimenLaboral: updated.regimenLaboral,
    tipoContrato: updated.tipoContrato,
    organization: updated.organization,
  })
})
