import type { ReactNode } from 'react'
import { DashboardPreview } from '../_preview/dashboard-preview'

// Vista previa dev: depende de la query string (?plan, ?trial) y de efectos
// del cliente, así que no tiene sentido prerenderizarla.
export const dynamic = 'force-dynamic'

export default function ShellPreviewLayout({ children }: { children: ReactNode }) {
  return <DashboardPreview>{children}</DashboardPreview>
}
