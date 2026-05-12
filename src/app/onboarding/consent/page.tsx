/**
 * /onboarding/consent
 *
 * Pantalla obligatoria post-signup. Reemplaza al ConsentModal flotante que
 * antes vivía dentro del layout del dashboard (rendereaba al final de cada
 * página como banner inline en lugar de comportarse como un blocker real).
 *
 * Server Component para validar auth y leer si la org ya aceptó el consent
 * vigente. Si ya está aceptado → redirect a /dashboard.
 */

import { redirect } from 'next/navigation'

import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CONSENT_VERSION } from '@/lib/legal/consent-versions'

import { ConsentClient } from './client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Antes de continuar · Comply360',
  description:
    'Revisa y acepta los documentos legales requeridos para activar tu cuenta de Comply360.',
}

export default async function ConsentPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const requiredVersion = CONSENT_VERSION.org
  const latest = await prisma.auditLog.findFirst({
    where: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'consent.accepted.org',
    },
    orderBy: { createdAt: 'desc' },
    select: { metadataJson: true },
  })

  const metadata = (latest?.metadataJson ?? null) as { version?: string } | null
  if (metadata?.version === requiredVersion) {
    redirect('/dashboard')
  }

  return <ConsentClient />
}
