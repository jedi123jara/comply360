import { Suspense } from 'react'

import { getAuthContext } from '@/lib/auth'
import { isRolloutEnabled } from '@/lib/plan-features'
import OrganigramaClient from './_components/organigrama-client'

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

export default async function OrganigramaPage() {
  const ctx = await getAuthContext()
  const v2Enabled = isRolloutEnabled('orgchart_v2', ctx?.orgId ?? null)

  return (
    <Suspense fallback={<FallbackSkeleton />}>
      {v2Enabled ? <OrganigramaV2Wrapper /> : <OrganigramaClient />}
    </Suspense>
  )
}
