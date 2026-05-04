import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { arcoUpdateSchema } from '@/lib/sst/schemas'
import { decryptMedical } from '@/lib/sst/medical-vault'

// =============================================
// GET /api/sst/derechos-arco/[id]
//
// Detalle de la solicitud. El campo `detalleCifrado` se descifra solo si
// el cliente lo pide explícitamente con ?descifrar=1, y se registra en el
// audit log quién y cuándo accedió.
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const url = new URL(req.url)
    const descifrar = url.searchParams.get('descifrar') === '1'

    const sol = await prisma.solicitudARCO.findFirst({
      where: { id, orgId: ctx.orgId },
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
        detalleCifrado: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!sol) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const { detalleCifrado, ...rest } = sol
    const result: Record<string, unknown> = {
      ...rest,
      tieneDetalle: !!detalleCifrado,
    }

    if (descifrar && detalleCifrado) {
      try {
        const plain = await decryptMedical(prisma, Buffer.from(detalleCifrado))
        result.detalle = plain
        await prisma.auditLog
          .create({
            data: {
              orgId: ctx.orgId,
              userId: ctx.userId,
              action: 'sst.arco.detalle.read',
              entityType: 'SolicitudARCO',
              entityId: sol.id,
              metadataJson: { tipo: sol.tipo, estado: sol.estado },
            },
          })
          .catch((e: unknown) => {
            console.error('[arco/GET] audit log failed:', e)
          })
      } catch {
        result.detalleError = 'No se pudo descifrar el detalle'
      }
    }

    return NextResponse.json({ solicitud: result })
  },
)

// =============================================
// PATCH /api/sst/derechos-arco/[id]
// Actualiza estado, asigna DPO, registra respuesta.
// =============================================
export const PATCH = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = arcoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.solicitudARCO.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.estado) {
      data.estado = parsed.data.estado
      if (parsed.data.estado === 'RESPONDIDA' && !existing.estado.includes('RESPONDIDA')) {
        data.respuestaAt = new Date()
      }
    }
    if (parsed.data.dpoAsignadoId !== undefined) data.dpoAsignadoId = parsed.data.dpoAsignadoId
    if (parsed.data.respuestaArchivoUrl !== undefined)
      data.respuestaArchivoUrl = parsed.data.respuestaArchivoUrl

    const solicitud = await prisma.solicitudARCO.update({
      where: { id },
      data,
      select: {
        id: true,
        tipo: true,
        estado: true,
        slaHasta: true,
        respuestaAt: true,
      },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.arco.updated',
          entityType: 'SolicitudARCO',
          entityId: solicitud.id,
          metadataJson: {
            estado: solicitud.estado,
            tipo: solicitud.tipo,
          },
        },
      })
      .catch((e: unknown) => {
        console.error('[arco/PATCH] audit log failed:', e)
      })

    return NextResponse.json({ solicitud })
  },
)
