import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/onboarding/progress
// Devuelve el estado de la guia de primeros pasos
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId

    const [org, workerCount, contractCount, calculationCount] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          onboardingCompleted: true,
          razonSocial: true,
          ruc: true,
          plan: true,
          subscription: {
            select: {
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      }),
      prisma.worker.count({ where: { orgId } }),
      prisma.contract.count({ where: { orgId } }),
      prisma.calculation.count({ where: { orgId } }),
    ])

    // ¿El usuario necesita ir a /onboarding/elegir-plan?
    // Sí SOLO cuando: completó wizard de empresa pero su org NO tiene plan
    // asignado (null/undefined) Y no tiene Subscription activa.
    //
    // Bug previo: STARTER se consideraba 'needs plan' porque no tenía
    // Subscription record, lo que rebotaba a TODAS las cuentas STARTER al
    // onboarding cada vez que abrían el dashboard. Catch-22 imposible de
    // escapar para el admin.
    //
    // Ahora: solo si plan es null/undefined (caso edge real de mid-onboarding)
    // o si la subscription expiró (downgrade pendiente). Si tiene cualquier
    // plan asignado (FREE/STARTER/EMPRESA/PRO/...), no se considera 'needs plan'.
    const now = new Date()
    const hasActiveSubscription = !!(
      org?.subscription &&
      (org.subscription.status === 'ACTIVE' ||
        (org.subscription.status === 'TRIALING' &&
          org.subscription.currentPeriodEnd &&
          org.subscription.currentPeriodEnd > now))
    )
    const hasAnyPlan = !!org?.plan // FREE/STARTER/EMPRESA/PRO/BUSINESS/ENTERPRISE
    const needsPlan = !!org?.onboardingCompleted && !hasAnyPlan && !hasActiveSubscription

    return NextResponse.json({
      hasOrg: org?.onboardingCompleted === true,
      hasWorker: workerCount > 0,
      hasContract: contractCount > 0,
      hasCalculation: calculationCount > 0,
      needsPlan,
      counts: {
        workers: workerCount,
        contracts: contractCount,
        calculations: calculationCount,
      },
      orgProfile: {
        ruc: org?.ruc ?? null,
        razonSocial: org?.razonSocial ?? null,
      },
    })
  } catch (error) {
    console.error('Onboarding progress error:', error)
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    )
  }
})
