/**
 * /api/workers/requests
 *
 * Admin-side endpoint for managing worker requests (vacaciones, permisos, etc.)
 *
 * GET  — List all pending/recent requests for the org (admin view)
 * PATCH — Approve or reject a request (with optional notes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// ─── GET — List requests for admin review ───────────────────────────────────

export const GET = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all' // PENDING, APPROVED, REJECTED, all
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const where: Record<string, unknown> = {
      worker: { orgId: ctx.orgId },
    }
    if (status !== 'all') {
      where.status = status // PENDIENTE, EN_REVISION, APROBADA, RECHAZADA, CANCELADA
    }

    const requests = await prisma.workerRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            position: true,
            department: true,
          },
        },
      },
    })

    const pendingCount = await prisma.workerRequest.count({
      where: { worker: { orgId: ctx.orgId }, status: 'PENDIENTE' },
    })

    return NextResponse.json({
      requests: requests.map(r => ({
        id: r.id,
        type: r.type,
        status: r.status,
        description: r.description,
        startDate: r.startDate,
        endDate: r.endDate,
        daysRequested: r.daysRequested,
        amount: r.amount ? Number(r.amount) : null,
        reviewNotes: r.reviewNotes,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        worker: r.worker ? {
          id: r.worker.id,
          name: `${r.worker.firstName} ${r.worker.lastName}`,
          dni: r.worker.dni,
          position: r.worker.position,
          department: r.worker.department,
        } : null,
      })),
      pendingCount,
    })
  } catch (error) {
    console.error('[Worker Requests GET] Error:', error)
    return NextResponse.json({ error: 'Error al cargar solicitudes' }, { status: 500 })
  }
})

// ─── PATCH — Approve or reject a request ────────────────────────────────────

export const PATCH = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json() as {
      requestId: string
      action: 'APROBADA' | 'RECHAZADA'
      reviewNotes?: string
    }

    if (!body.requestId || !body.action) {
      return NextResponse.json({ error: 'requestId y action son requeridos' }, { status: 400 })
    }

    if (!['APROBADA', 'RECHAZADA'].includes(body.action)) {
      return NextResponse.json({ error: 'action debe ser APROBADA o RECHAZADA' }, { status: 400 })
    }

    // Verify request belongs to this org
    const request = await prisma.workerRequest.findUnique({
      where: { id: body.requestId },
      include: { worker: { select: { orgId: true, id: true, firstName: true, lastName: true } } },
    })

    if (!request || request.worker?.orgId !== ctx.orgId) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    if (request.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 400 })
    }

    // Update request
    const updated = await prisma.workerRequest.update({
      where: { id: body.requestId },
      data: {
        status: body.action,
        reviewNotes: body.reviewNotes || null,
        reviewedAt: new Date(),
        reviewedById: ctx.userId,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: `SOLICITUD_${body.action}`,
        entityType: 'WorkerRequest',
        entityId: body.requestId,
        metadataJson: {
          type: request.type,
          workerName: `${request.worker?.firstName} ${request.worker?.lastName}`,
          reviewNotes: body.reviewNotes,
        },
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      request: {
        id: updated.id,
        status: updated.status,
        reviewNotes: updated.reviewNotes,
        reviewedAt: updated.reviewedAt,
      },
    })
  } catch (error) {
    console.error('[Worker Requests PATCH] Error:', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
})
