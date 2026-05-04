'use client'

import dynamic from 'next/dynamic'

const OrganigramaShellV2 = dynamic(
  () => import('../_v2/shell/organigrama-shell-v2').then((m) => m.OrganigramaShellV2),
  { ssr: false, loading: () => <div className="p-8 text-sm text-slate-500">Cargando organigrama…</div> },
)

export function OrganigramaV2Wrapper() {
  return <OrganigramaShellV2 />
}
