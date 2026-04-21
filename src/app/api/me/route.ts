import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/me
 * Devuelve info del usuario autenticado incluyendo su workerId
 * si tiene un perfil de trabajador vinculado en esta organización.
 */
export const GET = withAuth(async (_req, ctx) => {
  const worker = await prisma.worker.findFirst({
    where: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      status: { not: 'TERMINATED' },
    },
    select: { id: true, firstName: true, lastName: true, position: true, department: true },
  })

  return NextResponse.json({
    userId: ctx.userId,
    orgId: ctx.orgId,
    role: ctx.role,
    workerId: worker?.id ?? null,
    workerName: worker ? `${worker.firstName} ${worker.lastName}` : null,
    workerPosition: worker?.position ?? null,
    workerDepartment: worker?.department ?? null,
  })
})
