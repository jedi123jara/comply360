import { Suspense } from 'react'

import { getAuthContext } from '@/lib/auth'
import { isRolloutEnabled } from '@/lib/plan-features'
import OrganigramaClient from './_components/organigrama-client'
import { V1DeprecationBanner } from './_components/v1-deprecation-banner'

// Wrapper client-side que hace dynamic import del Shell v2.
// El bundle de @xyflow/react + dagre + d3-hierarchy (~120 kB gzip) solo
// entra cuando el flag está activo — no penaliza a tenants en v1.
import { OrganigramaV2Wrapper } from './_components/v2-wrapper'

export const metadata = {
  title: 'Organigrama · Comply360',
  description: 'Estructura organizacional viva con base legal peruana embebida.',
}

function FallbackSkeleton() {
  return <div className="p-8 text-sm text-slate-500">Cargando organigrama…</div>
}

interface PageProps {
  searchParams: Promise<{ v?: string }>
}

export default async function OrganigramaPage({ searchParams }: PageProps) {
  const ctx = await getAuthContext()
  const sp = await searchParams
  const flagEnabled = isRolloutEnabled('orgchart_v2', ctx?.orgId ?? null)
  // Opt-in vía query string: cualquier usuario puede probar v2 con ?v=2
  // sin tocar env vars de Vercel. Útil para piloto suave.
  const optInV2 = sp.v === '2'
  const v2Enabled = flagEnabled || optInV2

  return (
    <Suspense fallback={<FallbackSkeleton />}>
      {v2Enabled ? (
        <OrganigramaV2Wrapper />
      ) : (
        <>
          <V1DeprecationBanner />
          <OrganigramaClient />
        </>
      )}
    </Suspense>
  )
}
