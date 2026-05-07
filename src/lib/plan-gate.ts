import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { PLANS } from '@/lib/constants'
import {
  FEATURE_MIN_PLAN,
  PLAN_FEATURES,
  planHasFeature,
  type PlanFeature,
} from '@/lib/plan-features'

// =============================================
// PLAN FEATURES & LIMITS
// Defines what each plan can access
// =============================================

export { FEATURE_MIN_PLAN, PLAN_FEATURES, planHasFeature }
export type { PlanFeature }

// =============================================
// PLAN CHECKS
// =============================================

/**
 * Get all features available for a plan (for sidebar UI)
 */
export function getPlanFeatures(plan: string): PlanFeature[] {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
}

/**
 * Get max workers allowed for a plan
 */
export function getMaxWorkers(plan: string): number {
  const planConfig = PLANS[plan as keyof typeof PLANS]
  return (planConfig as { maxWorkers?: number })?.maxWorkers ?? 5
}

/**
 * Get max users allowed for a plan
 */
export function getMaxUsers(plan: string): number {
  const planConfig = PLANS[plan as keyof typeof PLANS]
  return (planConfig as { maxUsers?: number })?.maxUsers ?? 1
}

/**
 * Check if org has reached worker limit
 */
export async function checkWorkerLimit(orgId: string, plan: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const max = getMaxWorkers(plan)
  const current = await prisma.worker.count({
    where: { orgId, status: { not: 'TERMINATED' } },
  })
  return { allowed: current < max, current, max }
}

// =============================================
// API MIDDLEWARE
// =============================================

/**
 * Middleware that gates API access by plan feature.
 * Usage: export const POST = withPlanGate('asistente_ia', async (req, ctx) => { ... })
 */
export function withPlanGate(
  requiredFeature: PlanFeature,
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>,
) {
  return withAuth(async (req: NextRequest, ctx: AuthContext) => {
    // Founder bypass: SUPER_ADMIN y emails en FOUNDER_EMAILS pueden usar
    // todas las features sin pagar plan. Útil para que el dueño pruebe
    // PRO/ENTERPRISE features con su cuenta de admin sin cambiar de plan.
    if (ctx.role === 'SUPER_ADMIN') {
      return handler(req, ctx)
    }
    const founderEmails = (process.env.FOUNDER_EMAILS ?? process.env.FOUNDER_EMAIL ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const ctxEmail = typeof ctx.email === 'string' ? ctx.email.toLowerCase() : ''
    if (ctxEmail && founderEmails.includes(ctxEmail)) {
      return handler(req, ctx)
    }

    // Fetch org plan
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { plan: true, planExpiresAt: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organizacion no encontrada', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      )
    }

    // Check if trial expired (downgrade should have happened via cron, but double-check)
    // FIX #0.4: si planExpiresAt vencido, degradamos a FREE (no STARTER).
    // Antes, una org cuyo trial PRO expiraba sin que corra el cron mantenía
    // STARTER de regalo (S/249/mes equivalente) hasta 24h. Fail closed.
    let effectivePlan = org.plan
    if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
      effectivePlan = 'FREE'
    }

    // Check feature access
    if (!planHasFeature(effectivePlan, requiredFeature)) {
      const minPlan = FEATURE_MIN_PLAN[requiredFeature]
      return NextResponse.json(
        {
          error: `Esta funcion requiere el plan ${minPlan} o superior. Tu plan actual es ${effectivePlan}.`,
          code: 'PLAN_UPGRADE_REQUIRED',
          requiredPlan: minPlan,
          currentPlan: effectivePlan,
          upgradeUrl: '/dashboard/planes',
        },
        { status: 403 },
      )
    }

    return handler(req, ctx)
  })
}
