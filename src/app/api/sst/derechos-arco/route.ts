import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { arcoCreateSchema } from '@/lib/sst/schemas'
import { encryptMedical } from '@/lib/sst/medical-vault'

// =============================================
// GET /api/sst/derechos-arco
// Lista solicitudes ARCO para el DPO con SLA visible (20 días hábiles
// según Art. 41 Ley 29733).
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const tipo = searchParams.get('tipo')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (estado) where.estado = estado
  if (tipo) where.tipo = tipo

  const solicitudes = await prisma.solicitudARCO.findMany({
    where,
    orderBy: [{ estado: 'asc' }, { slaHasta: 'asc' }],
    select: {
      id: true,
      solicitanteDni: true,
      solicitanteName: true,
      tipo: true,
      estado: true,
      slaHasta: true,
      dpoAsignadoId: true,
      respuestaAt: true,
      respuestaArchivoUrl: true,
      createdAt: true,
      // detalleCifrado se EXCLUYE — sólo el detalle del [id]
    },
  })

  // Stats: vencidas vs en curso
  const now = new Date()
  const vencidas = solicitudes.filter(
    (s) => s.estado !== 'RESPONDIDA' && s.slaHasta < now,
  ).length
  const proximas = solicitudes.filter(
    (s) =>
      s.estado !== 'RESPONDIDA' &&
      s.slaHasta >= now &&
      s.slaHasta < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ).length

  return NextResponse.json({
    solicitudes,
    total: solicitudes.length,
    counts: { vencidas, proximas },
  })
})

// =============================================
// POST /api/sst/derechos-arco
// Crea una solicitud. El SLA se calcula automáticamente a 20 días hábiles
// desde hoy (Art. 41 Ley 29733). El detalle se cifra con pgcrypto.
// =============================================
function addBusinessDays(from: Date, days: number): Date {
  const r = new Date(from)
  let added = 0
  while (added < days) {
    r.setDate(r.getDate() + 1)
    const dow = r.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return r
}

export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = arcoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const detalleCifrado = await encryptMedical(prisma, data.detalle)
  const slaHasta = addBusinessDays(new Date(), 20)

  const solicitud = await prisma.solicitudARCO.create({
    data: {
      orgId: ctx.orgId,
      solicitanteDni: data.solicitanteDni,
      solicitanteName: data.solicitanteName,
      tipo: data.tipo,
      detalleCifrado,
      estado: 'RECIBIDA',
      slaHasta,
    },
    select: {
      id: true,
      tipo: true,
      estado: true,
      slaHasta: true,
      createdAt: true,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.arco.created',
        entityType: 'SolicitudARCO',
        entityId: solicitud.id,
        metadataJson: {
          tipo: solicitud.tipo,
          slaHasta: solicitud.slaHasta.toISOString(),
        },
      },
    })
    .catch((e: unknown) => {
      console.error('[arco/POST] audit log failed:', e)
    })

  return NextResponse.json({ solicitud }, { status: 201 })
})
