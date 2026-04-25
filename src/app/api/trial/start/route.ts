/**
 * POST /api/trial/start
 *
 * Activa trial PRO de 14 días sin tarjeta para la org del usuario autenticado.
 *
 * Reglas:
 *   - Solo role OWNER puede activar (quien paga debe decidir)
 *   - Solo disponible una vez por organización (chequea AuditLog trial.started previo)
 *   - Requiere que la org esté en plan FREE o STARTER actualmente
 *   - Setea plan=PRO + planExpiresAt=+14 días + Subscription status=TRIALING
 *   - Cron `check-trials` se encarga de downgrade automático al expirar
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

const TRIAL_DAYS = 14

export const POST = withRole('OWNER', async (_req, ctx: AuthContext) => {
  const now = new Date()
  const trialEnd = new Date(now)
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

  // ── Chequear que la org no haya usado trial antes ─────────────────────────
  const previousTrial = await prisma.auditLog.findFirst({
    where: {
      orgId: ctx.orgId,
      action: 'trial.started',
    },
    select: { id: true, createdAt: true },
  })

  if (previousTrial) {
    return NextResponse.json(
      {
        error: 'Ya usaste tu trial PRO. Actualizá a un plan pago para continuar.',
        code: 'TRIAL_ALREADY_USED',
        previousTrialAt: previousTrial.createdAt.toISOString(),
        upgradeUrl: '/dashboard/planes',
      },
      { status: 409 },
    )
  }

  // ── Verificar plan actual — solo FREE/STARTER pueden activar trial ────────
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { plan: true, name: true, razonSocial: true },
  })

  if (!org) {
    return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  }

  if (!['FREE', 'STARTER'].includes(org.plan)) {
    return NextResponse.json(
      {
        error: `Ya tienes plan ${org.plan}. El trial está disponible solo para cuentas nuevas o FREE/STARTER.`,
        code: 'PLAN_NOT_ELIGIBLE',
        currentPlan: org.plan,
      },
      { status: 409 },
    )
  }

  // ── Activar trial en transaction ──────────────────────────────────────────
  try {
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: ctx.orgId },
        data: {
          plan: 'PRO',
          planExpiresAt: trialEnd,
        },
      }),
      prisma.subscription.upsert({
        where: { orgId: ctx.orgId },
        create: {
          orgId: ctx.orgId,
          plan: 'PRO',
          status: 'TRIALING',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        },
        update: {
          plan: 'PRO',
          status: 'TRIALING',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          cancelledAt: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'trial.started',
          entityType: 'Organization',
          entityId: ctx.orgId,
          metadataJson: {
            plan: 'PRO',
            trialDays: TRIAL_DAYS,
            startsAt: now.toISOString(),
            endsAt: trialEnd.toISOString(),
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      plan: 'PRO',
      trialEnd: trialEnd.toISOString(),
      trialDays: TRIAL_DAYS,
      message: `Trial PRO activado por ${TRIAL_DAYS} días. Termina el ${trialEnd.toLocaleDateString('es-PE')}.`,
    })
  } catch (err) {
    console.error('[trial/start] failed', err)
    return NextResponse.json(
      { error: 'No se pudo activar el trial. Intentá de nuevo o contactanos.' },
      { status: 500 },
    )
  }
})
