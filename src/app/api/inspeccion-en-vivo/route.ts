/**
 * /api/inspeccion-en-vivo
 *
 * POST — Start a new live inspection session
 * GET  — List past / active inspection sessions for the org
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { getSolicitudesInspeccion, evaluarSolicitud, type InspeccionTipo, type HallazgoInspeccion } from '@/lib/compliance/simulacro-engine'

// ─── GET — List inspection sessions ─────────────────────────────────────────

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // ACTIVE, COMPLETED, all
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const where: Record<string, unknown> = { orgId: ctx.orgId }
    if (status && status !== 'all') {
      where.status = status
    }

    const sessions = await prisma.inspeccionEnVivo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tipo: true,
        status: true,
        inspectorName: true,
        startedAt: true,
        completedAt: true,
        scoreInspeccion: true,
        multaEstimada: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      sessions: sessions.map(s => ({
        ...s,
        multaEstimada: s.multaEstimada ? Number(s.multaEstimada) : null,
      })),
    })
  } catch (error) {
    console.error('[InspeccionEnVivo GET] Error:', error)
    return NextResponse.json({ error: 'Error al cargar inspecciones' }, { status: 500 })
  }
})

// ─── POST — Start new live inspection ───────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json() as {
      tipo?: string
      inspectorName?: string
      inspectorDNI?: string
      ordenInspeccion?: string
    }

    const tipo = (body.tipo || 'PREVENTIVA') as InspeccionTipo
    if (!['PREVENTIVA', 'POR_DENUNCIA', 'PROGRAMA_SECTORIAL'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de inspeccion invalido' }, { status: 400 })
    }

    // Check for existing ACTIVE session
    const active = await prisma.inspeccionEnVivo.findFirst({
      where: { orgId: ctx.orgId, status: 'ACTIVE' },
    })
    if (active) {
      return NextResponse.json({
        error: 'Ya existe una inspeccion activa',
        activeSessionId: active.id,
      }, { status: 409 })
    }

    // Get the 28 solicitudes for this inspection type
    const solicitudes = getSolicitudesInspeccion(tipo)

    // Auto-evaluate each solicitud against existing documents in the org
    const totalWorkers = await prisma.worker.count({
      where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
    })

    const documentos = await prisma.workerDocument.findMany({
      where: { worker: { orgId: ctx.orgId, status: { not: 'TERMINATED' } } },
      select: { documentType: true, status: true, category: true },
    })

    // Evaluate each solicitud to get initial hallazgos
    const hallazgos: HallazgoInspeccion[] = solicitudes.map(s =>
      evaluarSolicitud(s, documentos, totalWorkers),
    )

    // Create the session with initial hallazgos
    const session = await prisma.inspeccionEnVivo.create({
      data: {
        orgId: ctx.orgId,
        tipo,
        status: 'ACTIVE',
        inspectorName: body.inspectorName || null,
        inspectorDNI: body.inspectorDNI || null,
        ordenInspeccion: body.ordenInspeccion || null,
        hallazgosJson: hallazgos as unknown as object[],
        evidenciasJson: {},
      },
    })

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'INSPECCION_INICIADA',
        entityType: 'InspeccionEnVivo',
        entityId: session.id,
        metadataJson: { tipo, totalSolicitudes: solicitudes.length, totalWorkers },
      },
    }).catch(() => {})

    return NextResponse.json({
      sessionId: session.id,
      tipo,
      solicitudes,
      hallazgos,
      totalWorkers,
      status: 'ACTIVE',
    })
  } catch (error) {
    console.error('[InspeccionEnVivo POST] Error:', error)
    return NextResponse.json({ error: 'Error al iniciar inspeccion' }, { status: 500 })
  }
})
