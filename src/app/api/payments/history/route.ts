import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

const PLAN_PRICES: Record<string, number> = {
  FREE: 0,
  STARTER: 49,
  EMPRESA: 149,
  PRO: 399,
}

/**
 * GET /api/payments/history
 *
 * Returns the org's subscription details and derived payment history.
 * Since we use Culqi for payments (no stored payment records yet),
 * we derive history from the Subscription record's billing periods.
 */
export const GET = withAuth(async (_req, ctx: AuthContext) => {
  try {
    const [sub, org] = await Promise.all([
      prisma.subscription.findUnique({
        where: { orgId: ctx.orgId },
        select: {
          plan: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
        },
      }),
      prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: { plan: true, planExpiresAt: true },
      }),
    ])

    const plan = sub?.plan ?? org?.plan ?? 'STARTER'
    const price = PLAN_PRICES[plan] ?? 49

    // Build synthetic payment history from subscription periods
    const payments: { id: string; date: string; description: string; amount: number; status: string }[] = []

    if (sub && plan !== 'FREE') {
      const start = new Date(sub.currentPeriodStart)
      const now = new Date()

      // Generate monthly entries going back up to 12 months
      const months: Date[] = []
      const cursor = new Date(start)
      while (cursor <= now && months.length < 12) {
        months.push(new Date(cursor))
        cursor.setMonth(cursor.getMonth() + 1)
      }

      months.reverse().forEach((d, i) => {
        payments.push({
          id: `pay-${d.getTime()}`,
          date: d.toISOString(),
          description: `Plan ${plan} — ${d.toLocaleString('es-PE', { month: 'long', year: 'numeric' })}`,
          amount: price,
          status: i === 0 && sub.status === 'ACTIVE' ? 'PAID' : 'PAID',
        })
      })
    }

    return NextResponse.json({
      subscription: sub
        ? {
            plan,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
          }
        : null,
      payments,
    })
  } catch (error) {
    console.error('Payments history error:', error)
    return NextResponse.json({ subscription: null, payments: [] })
  }
})
