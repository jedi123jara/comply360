import { Suspense } from 'react'

import { OrganigramaWrapper } from './_v2/shell/orgchart-wrapper'

export const metadata = {
  title: 'Organigrama · Comply360',
  description: 'Estructura organizacional viva con base legal peruana embebida.',
}

function FallbackSkeleton() {
  return <div className="p-8 text-sm text-slate-500">Cargando organigrama…</div>
}

export default function OrganigramaPage() {
  return (
    <Suspense fallback={<FallbackSkeleton />}>
      <OrganigramaWrapper />
    </Suspense>
  )
}
