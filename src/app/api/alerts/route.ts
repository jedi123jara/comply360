import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/alerts - List normative alerts with per-org read status
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const impactLevel = searchParams.get('impactLevel')
    const orgId = ctx.orgId

    // Fetch alerts and org read status in parallel
    const [normAlerts, orgAlerts] = await Promise.all([
      prisma.normAlert.findMany({
        where: impactLevel ? { impactLevel: impactLevel as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' } : undefined,
        include: {
          norm: { select: { code: true, category: true } },
        },
        orderBy: [
          { impactLevel: 'asc' }, // CRITICAL first
          { publishedAt: 'desc' },
        ],
      }),
      prisma.orgAlert.findMany({
        where: { orgId },
        select: { normAlertId: true, status: true },
      }),
    ])

    // Build a lookup: normAlertId → status
    const readMap = new Map<string, string>()
    for (const oa of orgAlerts) {
      readMap.set(oa.normAlertId, oa.status)
    }

    const data = normAlerts.map(alert => {
      const orgStatus = readMap.get(alert.id) ?? 'UNREAD'
      return {
        id: alert.id,
        title: alert.title,
        summary: alert.summary,
        impactLevel: alert.impactLevel,
        publishedAt: alert.publishedAt.toISOString(),
        normCode: alert.norm.code,
        normCategory: alert.norm.category,
        affectedContractTypes: alert.affectedContractTypes,
        isRead: orgStatus === 'READ',
        isDismissed: orgStatus === 'DISMISSED',
        orgStatus,
      }
    })

    const visible = data.filter(a => a.orgStatus !== 'DISMISSED')

    const stats = {
      total: visible.length,
      unread: visible.filter(a => !a.isRead).length,
      critical: visible.filter(a => a.impactLevel === 'CRITICAL').length,
      high: visible.filter(a => a.impactLevel === 'HIGH').length,
    }

    return NextResponse.json({ data: visible, stats })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
})

// =============================================
// PATCH /api/alerts - Mark alert as read/dismissed
// =============================================
export const PATCH = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { alertId, status } = body
    const orgId = ctx.orgId

    if (!alertId || !status) {
      return NextResponse.json(
        { error: 'alertId and status are required' },
        { status: 400 }
      )
    }

    const VALID_STATUSES = ['READ', 'DISMISSED', 'UNREAD']
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Upsert: create or update the OrgAlert record
    const orgAlert = await prisma.orgAlert.upsert({
      where: { orgId_normAlertId: { orgId, normAlertId: alertId } },
      update: { status },
      create: { orgId, normAlertId: alertId, status },
    })

    return NextResponse.json({
      data: {
        id: orgAlert.id,
        alertId,
        orgId,
        status: orgAlert.status,
        updatedAt: orgAlert.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert status' },
      { status: 500 }
    )
  }
})
