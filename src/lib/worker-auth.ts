import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ResolvedWorkerForAuth {
  id: string
  orgId: string
  userId: string | null
  status: string
  firstName?: string
  lastName?: string
  position?: string | null
  department?: string | null
}

interface ResolveWorkerForAuthOptions {
  linkOrphan?: boolean
  includeProfile?: boolean
  includeTerminated?: boolean
}

/**
 * Resolves the worker identity for the signed-in person.
 *
 * A Comply360 user may be both an organization member (OWNER/ADMIN/etc.) and
 * a worker in the same company. Worker access therefore cannot be decided only
 * from User.role; it must be resolved from the Worker row linked by userId or
 * by the verified email address.
 */
export async function resolveWorkerForAuth(
  authCtx: AuthContext,
  options: ResolveWorkerForAuthOptions = {},
): Promise<ResolvedWorkerForAuth | null> {
  const { linkOrphan = true, includeProfile = false, includeTerminated = false } = options
  const statusWhere = includeTerminated ? {} : { status: { not: 'TERMINATED' as const } }
  const select = {
    id: true,
    orgId: true,
    userId: true,
    status: true,
    firstName: includeProfile,
    lastName: includeProfile,
    position: includeProfile,
    department: includeProfile,
  } as const

  let worker = await prisma.worker.findFirst({
    where: {
      userId: authCtx.userId,
      ...statusWhere,
    },
    select,
    orderBy: { createdAt: 'asc' },
  })

  if (!worker && authCtx.email) {
    worker = await prisma.worker.findFirst({
      where: {
        email: { equals: authCtx.email, mode: 'insensitive' },
        ...statusWhere,
        OR: [
          { userId: null },
          { userId: authCtx.userId },
        ],
      },
      select,
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!worker) return null

  if (!worker.userId && linkOrphan) {
    await prisma.worker.update({
      where: { id: worker.id },
      data: { userId: authCtx.userId },
    })

    // Only worker-only accounts should inherit orgId automatically. For an
    // OWNER/ADMIN dual account, the dashboard org remains untouched and worker
    // API calls use worker.orgId from the injected WorkerAuthContext.
    if (authCtx.role === 'WORKER' && authCtx.orgId !== worker.orgId) {
      await prisma.user.update({
        where: { id: authCtx.userId },
        data: { orgId: worker.orgId },
      }).catch(() => null)
    }

    worker = { ...worker, userId: authCtx.userId }
  }

  return worker
}
