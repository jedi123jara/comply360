import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { WorkerStatus } from '@/generated/prisma/client'

const VALID_STATUSES: WorkerStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']

/**
 * POST /api/workers/bulk-action
 * Body: { ids: string[], action: 'change-status', status: WorkerStatus }
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, action, status } = body as {
    ids: string[]
    action: string
    status?: string
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un ID' }, { status: 400 })
  }

  if (ids.length > 200) {
    return NextResponse.json({ error: 'Maximo 200 trabajadores por operacion' }, { status: 400 })
  }

  if (action === 'change-status') {
    if (!status || !VALID_STATUSES.includes(status as WorkerStatus)) {
      return NextResponse.json(
        { error: `Estado invalido. Opciones: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await prisma.worker.updateMany({
      where: { id: { in: ids }, orgId: ctx.orgId },
      data: { status: status as WorkerStatus },
    })

    return NextResponse.json({
      updated: result.count,
      action,
      status,
    })
  }

  return NextResponse.json({ error: `Accion no reconocida: ${action}` }, { status: 400 })
})
