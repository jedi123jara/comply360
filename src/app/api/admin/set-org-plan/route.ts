/**
 * POST /api/admin/set-org-plan
 *
 * Founders-only endpoint para cambiar el plan de cualquier organización
 * (por email del owner/admin). Útil para:
 *   - Testing en cuentas con plan distinto al real
 *   - Comping (regalar PRO a un cliente VIP)
 *   - Demos a prospectos (PRO temporal)
 *   - Soporte (downgrade tras cancelación)
 *
 * Body: { email: string, plan: string, expiresInDays?: number }
 *   - email: del User cuyo orgId vamos a actualizar
 *   - plan: FREE | STARTER | EMPRESA | PRO | BUSINESS | ENTERPRISE
 *   - expiresInDays: opcional. Si se pasa, la org vuelve a STARTER tras X días
 *
 * Auth:
 *   - SUPER_ADMIN, o
 *   - Email del caller en FOUNDER_EMAILS env var
 *
 * Audit: cada cambio queda en AuditLog con accion 'admin.set_org_plan'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const VALID_PLANS = ['FREE', 'STARTER', 'EMPRESA', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const
type Plan = typeof VALID_PLANS[number]

export const POST = withAuth(async (req: NextRequest, ctx) => {
  // ─── Auth: solo SUPER_ADMIN o founder por env var ──────────────────────
  const isSuperAdmin = ctx.role === 'SUPER_ADMIN'
  const founderEmails = (process.env.FOUNDER_EMAILS ?? process.env.FOUNDER_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const isFounder = founderEmails.includes(ctx.email.toLowerCase())

  if (!isSuperAdmin && !isFounder) {
    return NextResponse.json(
      {
        error:
          'Solo founders (configurados en FOUNDER_EMAILS) o SUPER_ADMIN pueden cambiar planes de orgs.',
        code: 'NOT_FOUNDER',
      },
      { status: 403 },
    )
  }

  // ─── Validar body ───────────────────────────────────────────────────────
  let body: { email?: string; plan?: string; expiresInDays?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido' },
      { status: 400 },
    )
  }

  const targetEmail = body.email?.trim().toLowerCase()
  const targetPlan = body.plan?.trim().toUpperCase() as Plan | undefined
  const expiresInDays = body.expiresInDays

  if (!targetEmail) {
    return NextResponse.json(
      { error: 'Falta el campo "email"' },
      { status: 400 },
    )
  }
  if (!targetPlan || !VALID_PLANS.includes(targetPlan)) {
    return NextResponse.json(
      {
        error: `Plan inválido. Valores permitidos: ${VALID_PLANS.join(', ')}`,
        validPlans: VALID_PLANS,
      },
      { status: 400 },
    )
  }

  // ─── Encontrar la org del user ──────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: { email: { equals: targetEmail, mode: 'insensitive' } },
    select: { id: true, email: true, role: true, orgId: true, organization: { select: { id: true, name: true, plan: true, planExpiresAt: true } } },
  })

  if (!user) {
    return NextResponse.json(
      { error: `No se encontró ningún User con email "${targetEmail}"` },
      { status: 404 },
    )
  }
  if (!user.organization) {
    return NextResponse.json(
      {
        error: `El User ${targetEmail} (role=${user.role}) no tiene organización asignada (orgId=${user.orgId ?? 'null'}). Si es WORKER, este endpoint no aplica — los workers no tienen plan propio.`,
      },
      { status: 400 },
    )
  }

  const oldPlan = user.organization.plan
  const oldExpiresAt = user.organization.planExpiresAt

  // ─── Calcular fecha de expiración si aplica ─────────────────────────────
  let newExpiresAt: Date | null = null
  if (expiresInDays && expiresInDays > 0) {
    newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + expiresInDays)
  }

  // ─── Aplicar cambio ─────────────────────────────────────────────────────
  await prisma.organization.update({
    where: { id: user.organization.id },
    data: {
      plan: targetPlan,
      planExpiresAt: newExpiresAt,
    },
  })

  // ─── Audit log ──────────────────────────────────────────────────────────
  try {
    await prisma.auditLog.create({
      data: {
        orgId: user.organization.id,
        userId: ctx.userId, // founder que hizo el cambio
        action: 'admin.set_org_plan',
        entityType: 'Organization',
        entityId: user.organization.id,
        metadataJson: {
          targetEmail,
          targetUserId: user.id,
          oldPlan,
          newPlan: targetPlan,
          oldExpiresAt: oldExpiresAt?.toISOString() ?? null,
          newExpiresAt: newExpiresAt?.toISOString() ?? null,
          changedBy: ctx.email,
          changedByRole: ctx.role,
        },
      },
    })
  } catch (auditErr) {
    // No-fatal: el cambio principal se aplicó
    console.error('[admin/set-org-plan] AuditLog write failed (non-fatal):', auditErr)
  }

  return NextResponse.json({
    ok: true,
    message: `Plan de la org "${user.organization.name}" cambiado: ${oldPlan} → ${targetPlan}`,
    org: {
      id: user.organization.id,
      name: user.organization.name,
      oldPlan,
      newPlan: targetPlan,
      newExpiresAt: newExpiresAt?.toISOString() ?? null,
      ownerEmail: user.email,
    },
    note: 'El user debe cerrar sesión y volver a iniciar (o esperar refresh de session ~60s) para que el frontend lea el nuevo plan.',
  })
})
