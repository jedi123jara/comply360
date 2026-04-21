import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { PLANS } from '@/lib/constants'

// =============================================
// PLAN FEATURES & LIMITS
// Defines what each plan can access
// =============================================

export type PlanFeature =
  | 'calculadoras'
  | 'workers'
  | 'alertas_basicas'
  | 'calendario'
  | 'contratos'
  | 'diagnostico'
  | 'simulacro_basico'
  | 'reportes_pdf'
  | 'ia_contratos'
  | 'asistente_ia'
  | 'review_ia'
  | 'simulacro_completo'
  | 'denuncias'
  | 'sst_completo'
  | 'api_access'

const PLAN_FEATURES: Record<string, PlanFeature[]> = {
  FREE: ['calculadoras'],
  STARTER: [
    'calculadoras', 'workers', 'alertas_basicas', 'calendario', 'contratos',
  ],
  EMPRESA: [
    'calculadoras', 'workers', 'alertas_basicas', 'calendario', 'contratos',
    'diagnostico', 'simulacro_basico', 'reportes_pdf', 'ia_contratos',
  ],
  PRO: [
    'calculadoras', 'workers', 'alertas_basicas', 'calendario', 'contratos',
    'diagnostico', 'simulacro_basico', 'reportes_pdf', 'ia_contratos',
    'asistente_ia', 'review_ia', 'simulacro_completo', 'denuncias', 'sst_completo', 'api_access',
  ],
}

// Feature → minimum plan required (for UI display)
export const FEATURE_MIN_PLAN: Record<PlanFeature, string> = {
  calculadoras: 'FREE',
  workers: 'STARTER',
  alertas_basicas: 'STARTER',
  calendario: 'STARTER',
  contratos: 'STARTER',
  diagnostico: 'EMPRESA',
  simulacro_basico: 'EMPRESA',
  reportes_pdf: 'EMPRESA',
  ia_contratos: 'EMPRESA',
  asistente_ia: 'PRO',
  review_ia: 'PRO',
  simulacro_completo: 'PRO',
  denuncias: 'PRO',
  sst_completo: 'PRO',
  api_access: 'PRO',
}

// =============================================
// PLAN CHECKS
// =============================================

/**
 * Check if a plan has access to a specific feature
 */
export function planHasFeature(plan: string, feature: PlanFeature): boolean {
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE
  return features.includes(feature)
}

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
    let effectivePlan = org.plan
    if (org.planExpiresAt && new Date(org.planExpiresAt) < new Date()) {
      // Trial expired but cron hasn't run yet — treat as STARTER
      effectivePlan = 'STARTER'
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
