/**
 * /api/consultor
 *
 * Portal Contador — Multi-org management for accountants and labor advisors.
 *
 * GET  — Return list of managed client orgs with their compliance stats
 * POST — Add a new client org to this consultor's portfolio (by RUC or orgId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// ─── GET — List managed clients with their latest stats ──────────────────────

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const consultorOrgId = ctx.orgId

    // Get all active client relationships for this consultor
    const clients = await prisma.consultorClient.findMany({
      where: {
        consultorOrgId,
        isActive: true,
      },
      orderBy: { addedAt: 'desc' },
      include: {
        clientOrg: {
          select: {
            id: true,
            name: true,
            razonSocial: true,
            ruc: true,
            sector: true,
            plan: true,
          },
        },
      },
    })

    // For each client, fetch key stats in parallel
    const clientsWithStats = await Promise.all(
      clients.map(async (rel) => {
        const orgId = rel.clientOrgId

        const [workerCount, criticalAlerts, latestDiag, openComplaints] = await Promise.all([
          prisma.worker.count({ where: { orgId, status: 'ACTIVE' } }),
          prisma.workerAlert.count({
            where: { orgId, severity: 'CRITICAL', resolvedAt: null },
          }),
          prisma.complianceDiagnostic.findFirst({
            where: { orgId, completedAt: { not: null } },
            orderBy: { createdAt: 'desc' },
            select: { scoreGlobal: true, totalMultaRiesgo: true, createdAt: true },
          }),
          prisma.complaint.count({ where: { orgId, status: { not: 'RESOLVED' } } }),
        ])

        return {
          id: rel.id,
          clientOrgId: orgId,
          clientOrgName: rel.clientOrg.razonSocial || rel.clientOrg.name,
          clientRuc: rel.clientOrg.ruc,
          sector: rel.clientOrg.sector,
          plan: rel.clientOrg.plan,
          notes: rel.notes,
          addedAt: rel.addedAt,
          stats: {
            workerCount,
            criticalAlerts,
            complianceScore: latestDiag?.scoreGlobal ?? null,
            multaRiesgo: latestDiag ? Number(latestDiag.totalMultaRiesgo) : null,
            lastDiagDate: latestDiag?.createdAt ?? null,
            openComplaints,
          },
        }
      })
    )

    // Aggregated stats across all clients
    const totalCritical = clientsWithStats.reduce((s, c) => s + c.stats.criticalAlerts, 0)
    const totalWorkers = clientsWithStats.reduce((s, c) => s + c.stats.workerCount, 0)
    const avgScore =
      clientsWithStats.filter((c) => c.stats.complianceScore !== null).length > 0
        ? Math.round(
            clientsWithStats
              .filter((c) => c.stats.complianceScore !== null)
              .reduce((s, c) => s + (c.stats.complianceScore ?? 0), 0) /
              clientsWithStats.filter((c) => c.stats.complianceScore !== null).length
          )
        : null

    return NextResponse.json({
      clients: clientsWithStats,
      aggregate: {
        totalClients: clientsWithStats.length,
        totalWorkers,
        totalCriticalAlerts: totalCritical,
        avgComplianceScore: avgScore,
      },
    })
  } catch (error) {
    console.error('[Consultor GET] Error:', error)
    return NextResponse.json({ error: 'Error al cargar clientes del consultor' }, { status: 500 })
  }
})

// ─── POST — Add a client org to this consultor's portfolio ──────────────────

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = (await req.json()) as { ruc?: string; notes?: string }

    // SECURITY: Only allow lookup by RUC, NEVER accept orgId from body (IDOR prevention)
    if (!body.ruc) {
      return NextResponse.json({ error: 'Se requiere el RUC del cliente' }, { status: 400 })
    }

    // Resolve org by RUC only
    const clientOrg = await prisma.organization.findFirst({
      where: { ruc: body.ruc },
      select: { id: true, name: true, razonSocial: true, ruc: true },
    })

    if (!clientOrg) {
      return NextResponse.json(
        { error: 'No se encontró ninguna empresa con ese RUC o ID' },
        { status: 404 }
      )
    }

    if (clientOrg.id === ctx.orgId) {
      return NextResponse.json(
        { error: 'No puedes agregar tu propia empresa como cliente' },
        { status: 400 }
      )
    }

    // Check for existing relation
    const existing = await prisma.consultorClient.findFirst({
      where: { consultorUserId: ctx.userId, clientOrgId: clientOrg.id },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: 'Esta empresa ya está en tu cartera de clientes' },
          { status: 409 }
        )
      }
      // Reactivate
      const updated = await prisma.consultorClient.update({
        where: { id: existing.id },
        data: { isActive: true, notes: body.notes || existing.notes },
      })
      return NextResponse.json({ success: true, relation: updated })
    }

    const relation = await prisma.consultorClient.create({
      data: {
        consultorUserId: ctx.userId,
        consultorOrgId: ctx.orgId,
        clientOrgId: clientOrg.id,
        clientOrgName: clientOrg.razonSocial || clientOrg.name,
        clientRuc: clientOrg.ruc,
        notes: body.notes,
      },
    })

    return NextResponse.json({ success: true, relation })
  } catch (error) {
    console.error('[Consultor POST] Error:', error)
    return NextResponse.json({ error: 'Error al agregar cliente' }, { status: 500 })
  }
})
