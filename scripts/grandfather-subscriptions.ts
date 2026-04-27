/**
 * scripts/grandfather-subscriptions.ts
 *
 * Aplica grandfather a usuarios actuales (pre T7.0 plan-gate fix):
 *
 *   - Para cada Organization que tenga plan != FREE Y no tenga Subscription,
 *     crea Subscription { status: 'TRIALING', currentPeriodEnd: now + 30d }
 *
 *   - Esto da 30 días para elegir plan antes de chocar con paywall.
 *     Sin esto, todos los usuarios actuales que abrieran el dashboard serían
 *     forzados al plan picker inmediatamente — mala experiencia retroactiva.
 *
 *   - El cron `check-trials` después se encarga de:
 *     - Día 27: email recordatorio "Tu trial expira en 3 días"
 *     - Día 30: status='PAST_DUE'
 *     - Día 37 (gracia): downgrade a 'FREE'
 *
 * Uso:
 *   DIRECT_URL="postgres://..." npx tsx scripts/grandfather-subscriptions.ts
 *
 * Idempotente: si ya hay Subscription, no la toca.
 */

import { prisma } from '../src/lib/prisma'

const GRANDFATHER_DAYS = 30

async function main() {
  console.log('=== Grandfather subscriptions ===')

  const candidates = await prisma.organization.findMany({
    where: {
      plan: { not: 'FREE' },
      subscription: null, // sin Subscription
    },
    select: {
      id: true,
      name: true,
      plan: true,
      alertEmail: true,
      createdAt: true,
    },
  })

  console.log(`Candidatos sin Subscription: ${candidates.length}`)

  if (candidates.length === 0) {
    console.log('Nada que hacer. Saliendo.')
    return
  }

  const now = new Date()
  const trialEnd = new Date(now.getTime() + GRANDFATHER_DAYS * 24 * 60 * 60 * 1000)

  let created = 0
  let failed = 0

  for (const org of candidates) {
    try {
      await prisma.subscription.create({
        data: {
          orgId: org.id,
          plan: org.plan as 'STARTER' | 'EMPRESA' | 'PRO' | 'ENTERPRISE',
          status: 'TRIALING',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        },
      })
      await prisma.organization.update({
        where: { id: org.id },
        data: { planExpiresAt: trialEnd },
      })
      await prisma.auditLog.create({
        data: {
          orgId: org.id,
          action: 'subscription.grandfathered',
          entityType: 'Subscription',
          entityId: org.id,
          metadataJson: {
            plan: org.plan,
            grandfatherDays: GRANDFATHER_DAYS,
            trialEndsAt: trialEnd.toISOString(),
            reason: 'pre_T7.0_plan_gate_fix',
          },
        },
      })
      created++
      console.log(`  ✓ ${org.name ?? org.id} (${org.plan}) → trial hasta ${trialEnd.toLocaleDateString('es-PE')}`)
    } catch (err) {
      failed++
      console.error(`  ✗ ${org.name ?? org.id} falló:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`\nResumen: ${created} creadas · ${failed} fallidas · ${candidates.length} totales`)
}

main()
  .catch((e) => {
    console.error('FATAL:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
