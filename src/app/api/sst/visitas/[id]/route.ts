import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { visitaUpdateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/visitas/[id]
// Detalle con hallazgos + colaborador + sede.
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const visita = await prisma.visitaFieldAudit.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: {
          select: {
            id: true,
            nombre: true,
            tipoInstalacion: true,
            direccion: true,
            distrito: true,
          },
        },
        colaborador: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            dni: true,
            email: true,
            telefono: true,
            especialidades: true,
          },
        },
        hallazgos: {
          orderBy: [{ severidad: 'desc' }, { createdAt: 'desc' }],
        },
      },
    })

    if (!visita) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    // Stats de hallazgos por severidad
    const summary = visita.hallazgos.reduce(
      (acc, h) => {
        acc[h.severidad] = (acc[h.severidad] ?? 0) + 1
        return acc
      },
      { TRIVIAL: 0, TOLERABLE: 0, MODERADO: 0, IMPORTANTE: 0, INTOLERABLE: 0 } as Record<string, number>,
    )

    return NextResponse.json({ visita, summary })
  },
)

// =============================================
// PATCH /api/sst/visitas/[id]
// Cambia estado, registra GPS / foto fachada / payload offline / notas.
//
// Estados válidos del flow:
//   PROGRAMADA → EN_CAMPO → PENDIENTE_INGESTA → EN_INGESTA → CERRADA
// O cancelar desde cualquiera salvo CERRADA.
//
// Auto-transiciones:
//   - Si setea fechaInicioCampo → estado = EN_CAMPO
//   - Si setea payloadOfflineJson → estado = PENDIENTE_INGESTA
// =============================================
export const PATCH = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = visitaUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.visitaFieldAudit.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    if (existing.estado === 'CERRADA') {
      return NextResponse.json(
        {
          error: 'La visita está cerrada y no admite cambios. Para corregir hallazgos, vuelve a programarla.',
          code: 'VISITA_LOCKED',
        },
        { status: 409 },
      )
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.estado) data.estado = parsed.data.estado
    if (parsed.data.fechaInicioCampo !== undefined) {
      data.fechaInicioCampo = parsed.data.fechaInicioCampo
        ? new Date(parsed.data.fechaInicioCampo)
        : null
      // Auto-transición si entra fecha de inicio y aún está PROGRAMADA
      if (parsed.data.fechaInicioCampo && existing.estado === 'PROGRAMADA' && !parsed.data.estado) {
        data.estado = 'EN_CAMPO'
      }
    }
    if (parsed.data.fechaCierreOficina !== undefined) {
      data.fechaCierreOficina = parsed.data.fechaCierreOficina
        ? new Date(parsed.data.fechaCierreOficina)
        : null
    }
    if (parsed.data.lat !== undefined) data.lat = parsed.data.lat
    if (parsed.data.lng !== undefined) data.lng = parsed.data.lng
    if (parsed.data.fotoFachadaUrl !== undefined) data.fotoFachadaUrl = parsed.data.fotoFachadaUrl
    if (parsed.data.payloadOfflineJson !== undefined) {
      data.payloadOfflineJson = parsed.data.payloadOfflineJson as never
      // Auto-transición a PENDIENTE_INGESTA cuando llega el payload de la tablet
      if (existing.estado === 'EN_CAMPO' && !parsed.data.estado) {
        data.estado = 'PENDIENTE_INGESTA'
      }
    }
    if (parsed.data.notasInspector !== undefined) data.notasInspector = parsed.data.notasInspector

    const visita = await prisma.visitaFieldAudit.update({
      where: { id },
      data,
      include: {
        sede: { select: { id: true, nombre: true } },
        colaborador: { select: { id: true, nombre: true, apellido: true } },
      },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.visita.updated',
          entityType: 'VisitaFieldAudit',
          entityId: visita.id,
          metadataJson: { estado: visita.estado },
        },
      })
      .catch((e: unknown) => {
        console.error('[visitas/PATCH] audit log failed:', e)
      })

    return NextResponse.json({ visita })
  },
)
