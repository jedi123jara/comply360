/**
 * GET /api/me/orgs
 *
 * Lista las organizaciones donde el user actual tiene rol OWNER/ADMIN/MEMBER.
 *
 * Estado actual (Sprint 4 MVP):
 *   - El modelo User tiene relación 1:1 con Organization (campo orgId String)
 *   - Por lo tanto, este endpoint retorna exactamente 1 org (la del user)
 *   - El switcher en UI se oculta cuando hay 1 sola org
 *
 * Roadmap multi-org (Sprint 5+):
 *   - Migrar a tabla `UserOrgMembership` (M:M con role per-membership)
 *   - Activar switcher cuando un user pertenece a 2+ orgs (holdings, contadores)
 *   - El primer cliente con multi-org dispara la migration
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withAuth(async (_req, ctx) => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      id: true,
      name: true,
      razonSocial: true,
      plan: true,
      ruc: true,
    },
  })

  if (!org) {
    return NextResponse.json({ orgs: [] })
  }

  return NextResponse.json({
    orgs: [
      {
        id: org.id,
        name: org.razonSocial || org.name,
        plan: org.plan,
        ruc: org.ruc,
        isActive: true,
      },
    ],
  })
})
