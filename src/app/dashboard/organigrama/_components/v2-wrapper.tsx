/**
 * Wrapper client-side que hace el dynamic import del Shell v2 y monta los
 * providers necesarios.
 *
 * Importante: el v2 usa `@tanstack/react-query` para todos los hooks de
 * data (`useTreeQuery`, `useSnapshotsQuery`, etc.). El dashboard layout NO
 * monta un `QueryClientProvider` global, así que lo agregamos aquí
 * localmente — solo se inicializa cuando el v2 se carga, no afecta al
 * resto del proyecto.
 */
'use client'

import dynamic from 'next/dynamic'
import { QueryProvider } from '@/providers/query-provider'

const OrganigramaShellV2 = dynamic(
  () => import('../_v2/shell/organigrama-shell-v2').then((m) => m.OrganigramaShellV2),
  {
    ssr: false,
    loading: () => <div className="p-8 text-sm text-slate-500">Cargando organigrama…</div>,
  },
)

export function OrganigramaV2Wrapper() {
  return (
    <QueryProvider>
      <OrganigramaShellV2 />
    </QueryProvider>
  )
}
