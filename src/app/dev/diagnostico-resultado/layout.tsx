import type { ReactNode } from 'react'
import { DashboardPreview } from '../_preview/dashboard-preview'

// Vista previa dev: shell real del dashboard + datos de ejemplo.
export const dynamic = 'force-dynamic'

export default function DiagnosticoResultadoPreviewLayout({ children }: { children: ReactNode }) {
  return <DashboardPreview>{children}</DashboardPreview>
}
