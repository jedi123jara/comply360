import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withSuperAdmin(async () => {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      ruc: true,
      sector: true,
      sizeRange: true,
      plan: true,
      onboardingCompleted: true,
      createdAt: true,
      _count: {
        select: { users: true, workers: true },
      },
    },
  })

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  })
})
