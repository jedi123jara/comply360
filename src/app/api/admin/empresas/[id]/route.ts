import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withSuperAdminParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withSuperAdminParams<{ id: string }>(async (_req, _ctx, params) => {
  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          workers: true,
          contracts: true,
          payslips: true,
          diagnostics: true,
          complaints: true,
          auditLogs: true,
        },
      },
    },
  })

  if (!org) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  }

  const recentUsers = await prisma.user.findMany({
    where: { orgId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    id: org.id,
    name: org.name,
    ruc: org.ruc,
    razonSocial: org.razonSocial,
    sector: org.sector,
    sizeRange: org.sizeRange,
    plan: org.plan,
    planExpiresAt: org.planExpiresAt?.toISOString() || null,
    onboardingCompleted: org.onboardingCompleted,
    createdAt: org.createdAt.toISOString(),
    alertEmail: org.alertEmail,
    regimenPrincipal: org.regimenPrincipal,
    stats: org._count,
    subscription: org.subscription
      ? {
          status: org.subscription.status,
          currentPeriodStart: org.subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: org.subscription.currentPeriodEnd.toISOString(),
        }
      : null,
    recentUsers: recentUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  })
})

const updateSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'EMPRESA', 'PRO']).optional(),
  alertEmail: z.string().email().nullable().optional(),
})

export const PATCH = withSuperAdminParams<{ id: string }>(async (req, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
  }

  // ── Validar downgrade de plan ───────────────────────────────
  if (parsed.data.plan) {
    const PLAN_LIMITS: Record<string, number | null> = {
      FREE: 5,
      STARTER: 25,
      EMPRESA: 100,
      PRO: null, // ilimitado
    }
    const newLimit = PLAN_LIMITS[parsed.data.plan]
    if (newLimit !== null) {
      const activeWorkers = await prisma.worker.count({
        where: { orgId: params.id, status: { not: 'TERMINATED' } },
      })
      if (activeWorkers > newLimit) {
        return NextResponse.json(
          {
            error: `No se puede cambiar al plan ${parsed.data.plan}: la empresa tiene ${activeWorkers} trabajadores activos pero el límite del plan es ${newLimit}. Desvincule trabajadores o elija un plan con mayor capacidad.`,
            code: 'WORKER_LIMIT_EXCEEDED',
            workersCount: activeWorkers,
            planLimit: newLimit,
          },
          { status: 422 },
        )
      }
    }
  }
  // ── Fin validación ──────────────────────────────────────────

  const updated = await prisma.organization.update({
    where: { id: params.id },
    data: parsed.data,
  })

  // Audit log critico — accion de super admin
  await prisma.auditLog.create({
    data: {
      orgId: params.id,
      userId: ctx.userId,
      action: 'admin.organization.updated',
      entityType: 'Organization',
      entityId: params.id,
      metadataJson: { changes: parsed.data, by: ctx.email },
    },
  }).catch(() => null)

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    plan: updated.plan,
    alertEmail: updated.alertEmail,
  })
})
