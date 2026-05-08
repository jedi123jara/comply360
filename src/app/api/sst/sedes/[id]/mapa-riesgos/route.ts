import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Mapa de Riesgos por sede.
//
// Se persiste como `SstRecord` con type=MAPA_RIESGOS para evitar nueva
// migración. El layout (marcadores Konva, fondo del plano) va en `data`.
// =============================================

const markerSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum([
    'PELIGRO',
    'EQUIPO_SEGURIDAD',
    'PUNTO_REUNION',
    'EXTINTOR',
    'BOTIQUIN',
    'SALIDA_EMERGENCIA',
    'RUTA_EVACUACION',
    'ZONA_RESTRINGIDA',
    'OTRO',
  ]),
  x: z.number(),
  y: z.number(),
  rotacion: z.number().optional().default(0),
  etiqueta: z.string().max(80).optional().nullable(),
  severidad: z
    .enum(['TRIVIAL', 'TOLERABLE', 'MODERADO', 'IMPORTANTE', 'INTOLERABLE'])
    .optional()
    .nullable(),
})

const layoutSchema = z.object({
  planoUrl: z.string().url().nullable().optional(),
  ancho: z.number().min(100).max(20000),
  alto: z.number().min(100).max(20000),
  markers: z.array(markerSchema).max(500),
  notas: z.string().max(2000).nullable().optional(),
})

// =============================================
// GET /api/sst/sedes/[id]/mapa-riesgos
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo', 
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    // Verificar sede pertenece a la org
    const sede = await prisma.sede.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, nombre: true, planoArchivoUrl: true },
    })
    if (!sede) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    // Buscar el último mapa de riesgos en SstRecord
    const record = await prisma.sstRecord.findFirst({
      where: {
        orgId: ctx.orgId,
        type: 'MAPA_RIESGOS',
        title: id, // Identificamos por el ID de la sede en el title
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      sede: { id: sede.id, nombre: sede.nombre, planoArchivoUrl: sede.planoArchivoUrl },
      mapa: record?.data ?? null,
      recordId: record?.id ?? null,
      updatedAt: record?.updatedAt ?? null,
    })
  },
)

// =============================================
// POST /api/sst/sedes/[id]/mapa-riesgos
// Crea o actualiza el mapa de riesgos de la sede.
// =============================================
export const POST = withPlanGateParams<{ id: string }>('sst_completo', 
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = layoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const sede = await prisma.sede.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, nombre: true },
    })
    if (!sede) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    // Upsert del SstRecord MAPA_RIESGOS
    const existing = await prisma.sstRecord.findFirst({
      where: { orgId: ctx.orgId, type: 'MAPA_RIESGOS', title: id },
      select: { id: true },
    })

    let record
    if (existing) {
      record = await prisma.sstRecord.update({
        where: { id: existing.id },
        data: {
          description: `Mapa de riesgos · ${sede.nombre}`,
          data: parsed.data as never,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })
    } else {
      record = await prisma.sstRecord.create({
        data: {
          orgId: ctx.orgId,
          type: 'MAPA_RIESGOS',
          title: id,
          description: `Mapa de riesgos · ${sede.nombre}`,
          data: parsed.data as never,
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
          action: 'sst.mapa-riesgos.saved',
          entityType: 'SstRecord',
          entityId: record.id,
          metadataJson: {
            sedeId: id,
            markersCount: parsed.data.markers.length,
          },
        },
      })
      .catch((e: unknown) => {
        console.error('[mapa-riesgos] audit log failed:', e)
      })

    return NextResponse.json({ recordId: record.id, savedAt: record.updatedAt })
  },
)

