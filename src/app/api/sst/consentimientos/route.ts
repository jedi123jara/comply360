import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { consentimientoCreateSchema } from '@/lib/sst/schemas'
import { encryptMedical } from '@/lib/sst/medical-vault'

// =============================================
// GET /api/sst/consentimientos — Lista de consentimientos por trabajador
// (solo metadata visible: workerId, vigencia, revocadoAt, fechas).
// El texto y firma siempre quedan cifrados — sólo se descifran en operaciones
// específicas auditadas.
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const workerId = searchParams.get('workerId')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (workerId) where.workerId = workerId

  const consentimientos = await prisma.consentimientoLey29733.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      workerId: true,
      webauthnCredentialId: true,
      vigenciaHasta: true,
      revocadoAt: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      worker: {
        select: { id: true, firstName: true, lastName: true, dni: true },
      },
    },
  })

  return NextResponse.json({ consentimientos, total: consentimientos.length })
})

// =============================================
// POST /api/sst/consentimientos — Registrar consentimiento expreso
// El texto y la firma se cifran con pgcrypto antes de persistir.
// =============================================
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = consentimientoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const worker = await prisma.worker.findFirst({
    where: { id: data.workerId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  const [textoCifrado, firmaCifrada] = await Promise.all([
    encryptMedical(prisma, data.texto),
    encryptMedical(prisma, data.firma),
  ])

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const consentimiento = await prisma.consentimientoLey29733.create({
    data: {
      orgId: ctx.orgId,
      workerId: data.workerId,
      textoCifrado,
      firmaCifrada,
      webauthnCredentialId: data.webauthnCredentialId ?? null,
      ip,
      userAgent,
      vigenciaHasta: new Date(data.vigenciaHasta),
    },
    select: {
      id: true,
      workerId: true,
      vigenciaHasta: true,
      createdAt: true,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.consentimiento.created',
        entityType: 'ConsentimientoLey29733',
        entityId: consentimiento.id,
        ipAddress: ip,
        metadataJson: { workerId: consentimiento.workerId },
      },
    })
    .catch((e: unknown) => {
      console.error('[consentimientos/POST] audit log failed:', e)
    })

  return NextResponse.json({ consentimiento }, { status: 201 })
})
