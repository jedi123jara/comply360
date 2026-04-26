/**
 * POST /api/me/active-org
 * Body: { orgId }
 *
 * Setea cookie `comply360_active_org` con el ID de la org activa.
 *
 * Estado actual (Sprint 4 MVP):
 *   - El user actual solo pertenece a 1 org → este endpoint valida que
 *     orgId === ctx.orgId y setea la cookie.
 *   - Cuando exista UserOrgMembership (Sprint 5+), validará que el user
 *     pertenezca a la org antes de setear la cookie, y `getAuthContext`
 *     leerá la cookie para resolver el orgId activo.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

const COOKIE_NAME = 'comply360_active_org'
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({})) as { orgId?: string }
  const requested = body.orgId

  if (!requested) {
    return NextResponse.json({ error: 'orgId requerido' }, { status: 400 })
  }

  // MVP: solo permitimos la org actual del user. Cuando exista membership M:M,
  // verificar que el user pertenezca a `requested` antes de setear cookie.
  if (requested !== ctx.orgId) {
    return NextResponse.json(
      { error: 'No perteneces a esa organización', code: 'FORBIDDEN' },
      { status: 403 },
    )
  }

  const res = NextResponse.json({ success: true, orgId: requested })
  res.cookies.set(COOKIE_NAME, requested, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  })
  return res
})
