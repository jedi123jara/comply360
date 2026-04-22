// Server component gate: redirige SUPER_ADMIN a /admin (Founder Panel).
// El resto de usuarios ve el Cockpit en el componente cliente importado.
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import CockpitPage from './_cockpit-page'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const ctx = await getAuthContext()
  if (ctx?.role === 'SUPER_ADMIN') {
    redirect('/admin')
  }
  return <CockpitPage />
}
