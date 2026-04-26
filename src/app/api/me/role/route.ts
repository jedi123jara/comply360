/**
 * GET /api/me/role
 *
 * Endpoint de diagnóstico personal: devuelve el role + orgId del usuario
 * autenticado, leído directo del User en BD (no del JWT de Clerk, que puede
 * tener cache).
 *
 * Uso típico: cuando el panel /admin da 403 y queremos saber si el role
 * en BD es realmente SUPER_ADMIN o si la sesión está cacheada.
 *
 * Endpoint: `https://comply360.pe/api/me/role` con sesión activa.
 */

import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ctx = await getAuthContext()

  if (!ctx) {
    return NextResponse.json(
      { authenticated: false, message: 'Sin sesión activa. Inicia sesión.' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    authenticated: true,
    userId: ctx.userId,
    email: ctx.email ?? null,
    role: ctx.role,
    orgId: ctx.orgId,
    isSuperAdmin: ctx.role === 'SUPER_ADMIN',
    canAccessAdminPanel: ctx.role === 'SUPER_ADMIN',
    redirectTarget:
      ctx.role === 'SUPER_ADMIN'
        ? '/admin'
        : ctx.role === 'WORKER'
          ? '/mi-portal'
          : '/dashboard',
  })
}
