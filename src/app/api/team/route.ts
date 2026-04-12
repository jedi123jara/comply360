import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { UserRole } from '@/generated/prisma/client'

const VALID_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']

// =============================================
// GET /api/team - List org members + pending invitations
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.invitation.findMany({
      where: { orgId: ctx.orgId, status: 'PENDING' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ members, invitations })
})

// =============================================
// PATCH /api/team - Update a member's role
// =============================================
export const PATCH = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { userId, role } = body as { userId: string; role: string }

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId y role son requeridos' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: `Rol invalido: ${role}` }, { status: 400 })
  }

  // Prevent changing your own role
  if (userId === ctx.userId) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
  }

  // Only OWNER can assign OWNER role
  if (role === 'OWNER' && ctx.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Solo el propietario puede asignar el rol de propietario' },
      { status: 403 }
    )
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, orgId: ctx.orgId },
  })

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Cannot demote the only OWNER
  if (target.role === 'OWNER') {
    const ownerCount = await prisma.user.count({
      where: { orgId: ctx.orgId, role: 'OWNER' },
    })
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: 'No puedes cambiar el rol del unico propietario' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: role as UserRole },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  })

  return NextResponse.json({ data: updated })
})

// =============================================
// DELETE /api/team - Remove a member from org
// =============================================
export const DELETE = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId es requerido' }, { status: 400 })
  }

  if (userId === ctx.userId) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, orgId: ctx.orgId },
  })

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'No puedes eliminar al propietario' }, { status: 400 })
  }

  // Detach user from org (don't delete the user account)
  await prisma.user.update({
    where: { id: userId },
    data: { orgId: null, role: 'MEMBER' },
  })

  return NextResponse.json({ success: true })
})
