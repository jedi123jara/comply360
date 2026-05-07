// Server component gate: redirige SUPER_ADMIN a /admin (Founder Panel),
// chequea onboarding y resuelve TODOS los datos del cockpit antes de
// renderizar el componente cliente. Esto elimina el flash de empty state
// y las 3 fetches paralelas que el cockpit antes hacía en useEffect.
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCockpitFullPayload } from '@/lib/cockpit/data'
import CockpitPage from './_cockpit-page'
import { OnboardingWizard } from '@/components/dashboard/onboarding-wizard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const ctx = await getAuthContext()
  if (ctx?.role === 'SUPER_ADMIN') {
    redirect('/admin')
  }
  if (!ctx?.orgId) {
    // Sin organización (e.g., usuario huérfano post-Clerk) — fallback al wizard
    return <OnboardingWizard />
  }

  const orgId = ctx.orgId

  // Onboarding gate: si el wizard de empresa no se completó, lo mostramos.
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { onboardingCompleted: true },
  })
  if (!org?.onboardingCompleted) {
    return <OnboardingWizard />
  }

  // Resolver datos del cockpit en el servidor (queries paralelas internas).
  // Si falla, el catch global de Next renderiza /dashboard/error.tsx.
  const initialData = await getCockpitFullPayload(orgId)

  return (
    <CockpitPage
      initialData={initialData}
      initialScore={initialData.scoreSnapshot}
    />
  )
}
