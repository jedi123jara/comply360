/**
 * /api/consultor/[clientOrgId]
 *
 * GET   — Get detailed data for a specific client org (for consultor view)
 * PATCH — Update notes for this client relationship
 * DELETE — Remove this client from the consultor's portfolio
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const GET = withAuthParams<{ clientOrgId: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    try {
      const { clientOrgId } = params

      // Verify the relation exists for this consultor
      const relation = await prisma.consultorClient.findFirst({
        where: {
          consultorOrgId: ctx.orgId,
          clientOrgId,
          isActive: true,
        },
      })

      if (!relation) {
        return NextResponse.json({ error: 'Cliente no encontrado en tu cartera' }, { status: 404 })
      }

      // Fetch comprehensive org data for this client
      const [org, workers, alerts, complaints, diagnostics, latestScore] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: clientOrgId },
          select: {
            id: true,
            name: true,
            razonSocial: true,
            ruc: true,
            sector: true,
            plan: true,
            regimenPrincipal: true,
            alertEmail: true,
          },
        }),
        prisma.worker.findMany({
          where: { orgId: clientOrgId, status: 'ACTIVE' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            position: true,
            department: true,
            sueldoBruto: true,
            tipoAporte: true,
            status: true,
          },
          take: 50,
        }),
        prisma.workerAlert.findMany({
          where: { orgId: clientOrgId, resolvedAt: null },
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            type: true,
            severity: true,
            title: true,
            description: true,
            dueDate: true,
            multaEstimada: true,
            createdAt: true,
            worker: { select: { firstName: true, lastName: true } },
          },
        }),
        prisma.complaint.findMany({
          where: { orgId: clientOrgId, status: { not: 'RESOLVED' } },
          select: { id: true, type: true, status: true, receivedAt: true },
          take: 10,
        }),
        prisma.complianceDiagnostic.findMany({
          where: { orgId: clientOrgId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, type: true, scoreGlobal: true, totalMultaRiesgo: true, createdAt: true },
        }),
        prisma.complianceScore.findFirst({
          where: { orgId: clientOrgId },
          orderBy: { calculatedAt: 'desc' },
        }),
      ])

      return NextResponse.json({
        org,
        workers: workers.map((w) => ({
          ...w,
          sueldoBruto: Number(w.sueldoBruto),
        })),
        alerts: alerts.map((a) => ({
          ...a,
          multaEstimada: a.multaEstimada ? Number(a.multaEstimada) : null,
          workerName: a.worker
            ? `${a.worker.firstName} ${a.worker.lastName}`
            : null,
        })),
        complaints,
        diagnostics: diagnostics.map((d) => ({
          ...d,
          totalMultaRiesgo: Number(d.totalMultaRiesgo),
        })),
        complianceScore: latestScore
          ? { ...latestScore, multaEvitada: latestScore.multaEvitada ? Number(latestScore.multaEvitada) : null }
          : null,
        workerCount: workers.length,
        criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL').length,
      })
    } catch (error) {
      console.error('[Consultor Client GET] Error:', error)
      return NextResponse.json({ error: 'Error al cargar datos del cliente' }, { status: 500 })
    }
  }
)

export const PATCH = withAuthParams<{ clientOrgId: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    try {
      const { clientOrgId } = params
      const body = (await req.json()) as { notes?: string }

      const relation = await prisma.consultorClient.findFirst({
        where: { consultorOrgId: ctx.orgId, clientOrgId, isActive: true },
      })

      if (!relation) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }

      const updated = await prisma.consultorClient.update({
        where: { id: relation.id },
        data: { notes: body.notes },
      })

      return NextResponse.json({ success: true, relation: updated })
    } catch (error) {
      console.error('[Consultor Client PATCH] Error:', error)
      return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
    }
  }
)

export const DELETE = withAuthParams<{ clientOrgId: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    try {
      const { clientOrgId } = params

      const relation = await prisma.consultorClient.findFirst({
        where: { consultorOrgId: ctx.orgId, clientOrgId, isActive: true },
      })

      if (!relation) {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }

      await prisma.consultorClient.update({
        where: { id: relation.id },
        data: { isActive: false },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Consultor Client DELETE] Error:', error)
      return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
    }
  }
)
