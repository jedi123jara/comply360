import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, type AuthContext } from '@/lib/auth'
import { workerPortalLimiter, superAdminLimiter } from '@/lib/rate-limit'
import { checkIpBlock, getClientIp, recordAuthFailure, recordSuccess, trackRequest, logSecurityEvent } from '@/lib/security/middleware'

// =============================================
// ROLE HIERARCHY
// =============================================

export const ROLE_HIERARCHY: Record<string, number> = {
  WORKER: -1,     // Acceso restringido al portal del trabajador (no tiene acceso al dashboard)
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
  SUPER_ADMIN: 4, // Dueños de la plataforma — acceso global
}

export function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? -99) >= (ROLE_HIERARCHY[minRole] ?? 999)
}

/**
 * Returns true if the role is a worker-only role (cannot access dashboard).
 */
export function isWorkerRole(role: string): boolean {
  return role === 'WORKER'
}

/**
 * Returns true if the role is the platform super-admin role.
 */
export function isSuperAdminRole(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

/**
 * Returns true if the role belongs to an organization member (not WORKER, not SUPER_ADMIN).
 */
export function isOrgRole(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'VIEWER'
}

// =============================================
// BASE AUTH WRAPPER
// =============================================

/**
 * Wrapper for protected API route handlers.
 * Resolves auth context and passes it to the handler.
 * Returns 401 if not authenticated.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext, params?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx?: unknown) => {
    const isProd = process.env.NODE_ENV === 'production'

    // Security middleware only active in production
    if (isProd) {
      const ip = getClientIp(req)
      trackRequest(ip)

      const blockReason = checkIpBlock(ip)
      if (blockReason) {
        logSecurityEvent({ type: 'BRUTE_FORCE_DETECTED', ip, path: req.nextUrl.pathname })
        return NextResponse.json({ error: blockReason }, { status: 429 })
      }
    }

    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        if (isProd) {
          const ip = getClientIp(req)
          recordAuthFailure(ip)
          logSecurityEvent({ type: 'AUTH_FAILURE', ip, path: req.nextUrl.pathname })
        }
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (isProd) recordSuccess(getClientIp(req))
      return await handler(req, authCtx, routeCtx)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

/**
 * For dynamic routes with params: withAuthParams<{ id: string }>
 */
export function withAuthParams<P extends Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthContext, params: P) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      const params = await routeCtx.params
      return await handler(req, authCtx, params)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

// =============================================
// ROLE-GATED WRAPPERS
// =============================================

/**
 * Like withAuth but also enforces a minimum role.
 * Returns 403 if the user's role is insufficient.
 *
 * Usage: export const DELETE = withRole('ADMIN', async (req, ctx) => { ... })
 */
export function withRole(
  minRole: string,
  handler: (req: NextRequest, ctx: AuthContext, params?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx?: unknown) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!hasMinRole(authCtx.role, minRole)) {
        return NextResponse.json(
          { error: `Permiso denegado. Se requiere rol ${minRole} o superior.` },
          { status: 403 }
        )
      }
      return await handler(req, authCtx, routeCtx)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

/**
 * Role-gated wrapper for dynamic routes with params.
 */
export function withRoleParams<P extends Record<string, string>>(
  minRole: string,
  handler: (req: NextRequest, ctx: AuthContext, params: P) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!hasMinRole(authCtx.role, minRole)) {
        return NextResponse.json(
          { error: `Permiso denegado. Se requiere rol ${minRole} o superior.` },
          { status: 403 }
        )
      }
      const params = await routeCtx.params
      return await handler(req, authCtx, params)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

// =============================================
// SUPER ADMIN WRAPPER (dueños de la plataforma)
// =============================================

/**
 * Restringe acceso a endpoints de la plataforma (solo SUPER_ADMIN).
 * Usado para /api/admin/* — gestion global de organizaciones, billing, soporte.
 */
export function withSuperAdmin(
  handler: (req: NextRequest, ctx: AuthContext, params?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx?: unknown) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!isSuperAdminRole(authCtx.role)) {
        return NextResponse.json(
          { error: 'Acceso restringido a administradores de la plataforma.' },
          { status: 403 }
        )
      }
      // Rate limit por super-admin (500 req/min)
      const rl = await superAdminLimiter.check(req, `super-admin:${authCtx.userId}`)
      if (!rl.success && rl.response) return rl.response
      return await handler(req, authCtx, routeCtx)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('[withSuperAdmin] error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

export function withSuperAdminParams<P extends Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthContext, params: P) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!isSuperAdminRole(authCtx.role)) {
        return NextResponse.json(
          { error: 'Acceso restringido a administradores de la plataforma.' },
          { status: 403 }
        )
      }
      const rl = await superAdminLimiter.check(req, `super-admin:${authCtx.userId}`)
      if (!rl.success && rl.response) return rl.response
      const params = await routeCtx.params
      return await handler(req, authCtx, params)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('[withSuperAdminParams] error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

// =============================================
// WORKER AUTH WRAPPER (portal del trabajador)
// =============================================

export interface WorkerAuthContext extends AuthContext {
  workerId: string
}

/**
 * Restringe acceso al portal del trabajador (/mi-portal).
 * Solo permite acceso a usuarios con rol WORKER que tengan un Worker vinculado.
 * Inyecta workerId en el contexto.
 */
export function withWorkerAuth(
  handler: (req: NextRequest, ctx: WorkerAuthContext, params?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx?: unknown) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!isWorkerRole(authCtx.role)) {
        return NextResponse.json(
          { error: 'Este portal es solo para trabajadores.' },
          { status: 403 }
        )
      }

      // Rate limit por trabajador (30 req/min)
      const rl = await workerPortalLimiter.check(req, `worker:${authCtx.userId}`)
      if (!rl.success && rl.response) return rl.response

      // Resolver el Worker vinculado al User
      const { prisma } = await import('@/lib/prisma')
      const worker = await prisma.worker.findUnique({
        where: { userId: authCtx.userId },
        select: { id: true, orgId: true, status: true },
      })

      if (!worker) {
        return NextResponse.json(
          { error: 'No se encontro un perfil de trabajador asociado.' },
          { status: 404 }
        )
      }

      if (worker.status === 'TERMINATED') {
        return NextResponse.json(
          { error: 'Cuenta deshabilitada. Contacte a su empleador.' },
          { status: 403 }
        )
      }

      const workerCtx: WorkerAuthContext = {
        ...authCtx,
        orgId: worker.orgId, // Forzamos orgId del worker (defensa en profundidad)
        workerId: worker.id,
      }

      return await handler(req, workerCtx, routeCtx)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('[withWorkerAuth] error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

export function withWorkerAuthParams<P extends Record<string, string>>(
  handler: (req: NextRequest, ctx: WorkerAuthContext, params: P) => Promise<NextResponse>
) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    try {
      const authCtx = await getAuthContext()
      if (!authCtx) {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      if (!isWorkerRole(authCtx.role)) {
        return NextResponse.json(
          { error: 'Este portal es solo para trabajadores.' },
          { status: 403 }
        )
      }

      const rl = await workerPortalLimiter.check(req, `worker:${authCtx.userId}`)
      if (!rl.success && rl.response) return rl.response

      const { prisma } = await import('@/lib/prisma')
      const worker = await prisma.worker.findUnique({
        where: { userId: authCtx.userId },
        select: { id: true, orgId: true, status: true },
      })

      if (!worker) {
        return NextResponse.json(
          { error: 'No se encontro un perfil de trabajador asociado.' },
          { status: 404 }
        )
      }

      if (worker.status === 'TERMINATED') {
        return NextResponse.json(
          { error: 'Cuenta deshabilitada. Contacte a su empleador.' },
          { status: 403 }
        )
      }

      const workerCtx: WorkerAuthContext = {
        ...authCtx,
        orgId: worker.orgId,
        workerId: worker.id,
      }

      const params = await routeCtx.params
      return await handler(req, workerCtx, params)
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'No autorizado. Inicie sesion.' },
          { status: 401 }
        )
      }
      console.error('[withWorkerAuthParams] error:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}
