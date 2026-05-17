import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { resolveWorkerForAuth } from '@/lib/worker-auth'

/**
 * GET /api/me
 * Devuelve info del usuario autenticado incluyendo su workerId si tiene una
 * ficha de trabajador activa. Esto soporta cuentas duales: dueño/admin de la
 * empresa que además es trabajador.
 */
export const GET = withAuth(async (_req, ctx) => {
  const worker = await resolveWorkerForAuth(ctx, { includeProfile: true })

  return NextResponse.json({
    userId: ctx.userId,
    orgId: ctx.orgId,
    role: ctx.role,
    workerOrgId: worker?.orgId ?? null,
    workerId: worker?.id ?? null,
    workerName: worker ? `${worker.firstName ?? ''} ${worker.lastName ?? ''}`.trim() : null,
    workerPosition: worker?.position ?? null,
    workerDepartment: worker?.department ?? null,
  })
})
