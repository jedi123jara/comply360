/**
 * Wrapper client-side que monta el Shell del organigrama y sus providers.
 *
 * El dashboard layout NO monta un `QueryClientProvider` global, así que lo
 * agregamos aquí localmente — solo se inicializa cuando el organigrama se
 * carga, no afecta al resto del proyecto.
 */
'use client'

import { QueryProvider } from '@/providers/query-provider'
import { OrganigramaShellV2 } from './organigrama-shell-v2'

export function OrganigramaWrapper() {
  return (
    <QueryProvider>
      <OrganigramaShellV2 />
    </QueryProvider>
  )
}
