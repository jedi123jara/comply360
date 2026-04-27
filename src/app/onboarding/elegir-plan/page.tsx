/**
 * /onboarding/elegir-plan
 *
 * Página obligatoria post-signup. El usuario nuevo (que ya completó datos
 * de empresa) debe elegir UN plan antes de entrar al dashboard.
 *
 * Dos CTAs por plan:
 *   - "Iniciar 14 días gratis" → POST /api/subscriptions/start-trial
 *   - "Pagar ahora -20%" → POST /api/subscriptions/start-paid (requiere Culqi)
 *
 * El plan FREE no tiene CTAs de pago — solo "Continuar gratis".
 *
 * Server Component para verificar auth y leer estado actual de la org.
 * Si el usuario YA tiene Subscription activa o trial vigente, redirect
 * automático al dashboard.
 */

import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ElegirPlanClient } from './client'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Elige tu plan | Comply360',
  description: 'Activa tu trial de 14 días sin tarjeta o paga ahora con 20% off.',
}

export default async function ElegirPlanPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      name: true,
      sizeRange: true,
      alertEmail: true,
      onboardingCompleted: true,
      subscription: {
        select: { status: true, plan: true, currentPeriodEnd: true },
      },
    },
  })

  if (!org) redirect('/sign-in')

  // Si ya completó el wizard de empresa pero no eligió plan, ok — mostramos plan picker
  // Si ya tiene Subscription activa o trialing vigente, NO mostrar — redirigir
  if (org.subscription) {
    const isActive = org.subscription.status === 'ACTIVE'
    const isTrialing =
      org.subscription.status === 'TRIALING' &&
      org.subscription.currentPeriodEnd &&
      org.subscription.currentPeriodEnd > new Date()
    if (isActive || isTrialing) {
      redirect('/dashboard')
    }
  }

  // Si todavía no completó datos de empresa, mandarlo al wizard previo
  if (!org.onboardingCompleted) {
    redirect('/dashboard/onboarding?next=/onboarding/elegir-plan')
  }

  return (
    <ElegirPlanClient
      orgName={org.name ?? 'tu empresa'}
      sizeRange={org.sizeRange ?? null}
      alertEmail={org.alertEmail ?? ''}
    />
  )
}
