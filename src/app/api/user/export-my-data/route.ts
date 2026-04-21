/**
 * GET /api/user/export-my-data
 *
 * Derecho de portabilidad de datos personales — Ley N° 29733 Art. 22.
 * Devuelve todos los datos del usuario autenticado en JSON descargable.
 *
 * Aplicable tanto a:
 *  • Admin/owner de org (scope=user): sus datos + config de org (no workers ajenos)
 *  • Worker (scope=worker): sus datos personales + legajo + boletas + contratos + solicitudes
 *
 * El scope se detecta automáticamente por el role del caller.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

export const GET = withAuth(async (_req, ctx: AuthContext) => {
  try {
    const exportedAt = new Date().toISOString()

    // Datos comunes (User + Org summary)
    const [user, org] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          orgId: true,
          pushSubscription: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: {
          id: true,
          name: true,
          razonSocial: true,
          ruc: true,
          sector: true,
          plan: true,
          alertEmail: true,
          createdAt: true,
        },
      }),
    ])

    // Audit log del usuario (actividad histórica)
    const auditLogs = await prisma.auditLog.findMany({
      where: { orgId: ctx.orgId, userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        action: true,
        entityType: true,
        entityId: true,
        metadataJson: true,
        ipAddress: true,
        createdAt: true,
      },
    })

    // Si es WORKER, agregar sus datos personales específicos
    let workerData: Record<string, unknown> | null = null
    if (ctx.role === 'WORKER') {
      const worker = await prisma.worker.findUnique({
        where: { userId: ctx.userId },
        include: {
          documents: true,
          vacations: true,
          alerts: true,
          payslips: {
            select: {
              id: true,
              periodo: true,
              fechaEmision: true,
              totalIngresos: true,
              totalDescuentos: true,
              netoPagar: true,
              status: true,
              acceptedAt: true,
            },
          },
          requests: true,
          workerContracts: {
            include: {
              contract: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  status: true,
                  signedAt: true,
                  createdAt: true,
                },
              },
            },
          },
          attendance: {
            take: 200,
            orderBy: { clockIn: 'desc' },
          },
        },
      })
      workerData = worker as unknown as Record<string, unknown>
    }

    const payload = {
      _meta: {
        exportedAt,
        exportedBy: ctx.email,
        legalBasis: 'Ley N° 29733 Art. 22 — Derecho de portabilidad de datos personales',
        format: 'json-v1',
      },
      user,
      organization: org,
      worker: workerData,
      auditLog: auditLogs,
    }

    const filename = `comply360-my-data-${ctx.userId.slice(0, 8)}-${exportedAt.slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache',
      },
    })
  } catch (err) {
    console.error('[export-my-data] failed', err)
    return NextResponse.json(
      { error: 'No se pudieron exportar los datos. Contacta a datos@comply360.pe' },
      { status: 500 },
    )
  }
})
