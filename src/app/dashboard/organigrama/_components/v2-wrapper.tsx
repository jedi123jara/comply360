/**
 * Wrapper client-side que monta el Shell v2 y sus providers necesarios.
 *
 * Importante: el v2 usa `@tanstack/react-query` para todos los hooks de
 * data (`useTreeQuery`, `useSnapshotsQuery`, etc.). El dashboard layout NO
 * monta un `QueryClientProvider` global, así que lo agregamos aquí
 * localmente — solo se inicializa cuando el v2 se carga, no afecta al
 * resto del proyecto.
 */
'use client'

import { QueryProvider } from '@/providers/query-provider'
import { OrganigramaShellV2 } from '../_v2/shell/organigrama-shell-v2'

export function OrganigramaV2Wrapper() {
  return (
    <QueryProvider>
      <OrganigramaShellV2 />
    </QueryProvider>
  )
}
