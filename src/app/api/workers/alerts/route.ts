import { NextRequest, NextResponse } from 'next/server'
import { generateOrgAlerts, generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/workers/alerts - List worker alerts for the org
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const includeResolved = searchParams.get('includeResolved') === 'true'

  const alerts = await prisma.workerAlert.findMany({
    where: {
      orgId,
      ...(includeResolved ? {} : { resolvedAt: null }),
    },
    include: {
      worker: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
    take: 200,
  })

  return NextResponse.json({
    data: alerts.map(a => ({
      id: a.id,
      workerId: a.worker.id,
      workerName: `${a.worker.firstName} ${a.worker.lastName}`,
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate?.toISOString() ?? null,
      multaEstimada: a.multaEstimada ? Number(a.multaEstimada) : null,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    stats: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      high: alerts.filter(a => a.severity === 'HIGH').length,
    },
  })
})

// =============================================
// PATCH /api/workers/alerts - Resolve an alert
// =============================================
// Body: { alertId: string, resolvedBy?: string }
export const PATCH = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const alertId = body && typeof body === 'object' && 'alertId' in body
    ? (body as Record<string, unknown>).alertId
    : undefined

  if (!alertId || typeof alertId !== 'string') {
    return NextResponse.json({ error: 'alertId is required' }, { status: 400 })
  }

  // Verify alert belongs to org (tenant isolation)
  const alert = await prisma.workerAlert.findFirst({
    where: { id: alertId, orgId },
    select: { id: true, resolvedAt: true },
  })
  if (!alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  const updated = await prisma.workerAlert.update({
    where: { id: alertId },
    data: {
      resolvedAt: new Date(),
      resolvedBy: typeof (body as Record<string, unknown>).resolvedBy === 'string'
        ? (body as Record<string, unknown>).resolvedBy as string
        : ctx.userId ?? 'system',
    },
  })

  return NextResponse.json({ data: { id: updated.id, resolvedAt: updated.resolvedAt?.toISOString() } })
})

// =============================================
// POST /api/workers/alerts - Generate alerts
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const workerId = body && typeof body === 'object' && 'workerId' in body
    ? (body as Record<string, unknown>).workerId
    : undefined

  if (workerId !== undefined) {
    if (typeof workerId !== 'string' || !workerId.trim()) {
      return NextResponse.json({ error: 'workerId must be a non-empty string' }, { status: 400 })
    }

    // Verify the worker belongs to the authenticated org (tenant isolation)
    const worker = await prisma.worker.findFirst({
      where: { id: workerId, orgId },
      select: { id: true },
    })
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    try {
      const count = await generateWorkerAlerts(workerId)
      return NextResponse.json({ data: { workerId, alertsGenerated: count } })
    } catch (err) {
      console.error('generateWorkerAlerts error:', err)
      return NextResponse.json({ error: 'Failed to generate alerts for worker' }, { status: 500 })
    }
  }

  // Generate for all workers in org
  try {
    const result = await generateOrgAlerts(orgId)
    return NextResponse.json({
      data: {
        orgId,
        workersProcessed: result.workers,
        alertsGenerated: result.total,
      },
    })
  } catch (err) {
    console.error('generateOrgAlerts error:', err)
    return NextResponse.json({ error: 'Failed to generate alerts for org' }, { status: 500 })
  }
})
