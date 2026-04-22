/**
 * GET /api/admin/support
 *
 * Lista los últimos tickets de soporte (SUPPORT_TICKET_CREATED en AuditLog).
 * Incluye datos del usuario que los creó.
 *
 * Protegido: SUPER_ADMIN.
 */

import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withSuperAdmin(async () => {
  const logs = await prisma.auditLog.findMany({
    where: { action: 'SUPPORT_TICKET_CREATED' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      organization: { select: { id: true, name: true, plan: true } },
    },
  })

  const tickets = logs.map((l) => {
    const meta = (l.metadataJson as Record<string, unknown>) ?? {}
    return {
      id: l.id,
      code: `TKT-${l.createdAt.getFullYear()}-${l.id.slice(-6).toUpperCase()}`,
      subject: typeof meta.subject === 'string' ? meta.subject : '(sin asunto)',
      description: typeof meta.description === 'string' ? meta.description : '',
      category: typeof meta.category === 'string' ? meta.category : 'otro',
      priority: typeof meta.priority === 'string' ? meta.priority : 'media',
      createdAt: l.createdAt.toISOString(),
      reporter: l.user
        ? {
            email: l.user.email,
            name: [l.user.firstName, l.user.lastName].filter(Boolean).join(' ').trim() || null,
          }
        : null,
      org: l.organization
        ? { id: l.organization.id, name: l.organization.name, plan: l.organization.plan }
        : null,
    }
  })

  // Stats simples
  const totalOpen = tickets.length
  const byPriority = tickets.reduce(
    (acc, t) => {
      acc[t.priority] = (acc[t.priority] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return NextResponse.json({ tickets, stats: { totalOpen, byPriority } })
})
