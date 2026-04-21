import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { UserRole } from '@/generated/prisma/client'
import { randomBytes } from 'crypto'

const VALID_ROLES: UserRole[] = ['ADMIN', 'MEMBER', 'VIEWER']

// =============================================
// POST /api/team/invite - Send invitation
// =============================================
export const POST = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json()
  const { email, role } = body as { email: string; role: string }

  if (!email || !role) {
    return NextResponse.json({ error: 'email y role son requeridos' }, { status: 400 })
  }

  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json(
      { error: `Rol invalido. Permitidos: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  // Check if already a member
  const existingMember = await prisma.user.findFirst({
    where: { email, orgId: ctx.orgId },
  })
  if (existingMember) {
    return NextResponse.json(
      { error: 'Este email ya es miembro de la organizacion' },
      { status: 400 }
    )
  }

  // Check plan limits
  const memberCount = await prisma.user.count({ where: { orgId: ctx.orgId } })
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { plan: true },
  })
  const PLAN_MEMBER_LIMITS: Record<string, number> = {
    FREE: 1,
    STARTER: 1,
    EMPRESA: 5,
    PRO: 999999,
  }
  const limit = PLAN_MEMBER_LIMITS[org?.plan ?? 'FREE'] ?? 1
  if (memberCount >= limit) {
    return NextResponse.json(
      { error: `Limite de miembros alcanzado para tu plan (${limit}). Actualiza tu plan para invitar mas.` },
      { status: 403 }
    )
  }

  // Upsert invitation (reset if previously expired/cancelled)
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await prisma.invitation.upsert({
    where: { orgId_email: { orgId: ctx.orgId, email } },
    create: {
      orgId: ctx.orgId,
      email,
      role: role as UserRole,
      token,
      status: 'PENDING',
      expiresAt,
    },
    update: {
      role: role as UserRole,
      token,
      status: 'PENDING',
      expiresAt,
    },
  })

  // In production, send email via Resend here
  // For now, return the invite link in the response (dev mode)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`

  return NextResponse.json({
    data: { id: invitation.id, email, role, expiresAt },
    inviteUrl,
  })
})

// =============================================
// DELETE /api/team/invite - Cancel invitation
// =============================================
export const DELETE = withRole('ADMIN', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const invitationId = searchParams.get('id')

  if (!invitationId) {
    return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
  }

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, orgId: ctx.orgId },
  })

  if (!invitation) {
    return NextResponse.json({ error: 'Invitacion no encontrada' }, { status: 404 })
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ success: true })
})
