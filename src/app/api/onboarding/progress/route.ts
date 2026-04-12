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
        },
      }),
      prisma.worker.count({ where: { orgId } }),
      prisma.contract.count({ where: { orgId } }),
      prisma.calculation.count({ where: { orgId } }),
    ])

    return NextResponse.json({
      hasOrg: org?.onboardingCompleted === true,
      hasWorker: workerCount > 0,
      hasContract: contractCount > 0,
      hasCalculation: calculationCount > 0,
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
