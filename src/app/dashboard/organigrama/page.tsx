import { Suspense } from 'react'
import OrganigramaClient from './_components/organigrama-client'

export const metadata = {
  title: 'Organigrama · Comply360',
  description: 'Estructura organizacional viva con base legal peruana embebida.',
}

export default function OrganigramaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Cargando organigrama…</div>}>
      <OrganigramaClient />
    </Suspense>
  )
}
