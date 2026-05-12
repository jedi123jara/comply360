'use client'

/**
 * Dashboard layout — orquesta los providers globales del dashboard
 * (Upgrade gate, Copilot, Calculator drawer) y delega la UI a
 * `<DashboardShell>` (extraído para preparar refactor a Server Component).
 *
 * Sigue siendo 'use client' porque los providers anidados requieren context
 * (UpgradeGateProvider, CopilotProvider, etc.). El refactor a Server Component
 * puro requiere mover los providers a un wrapper distinto (Sprint 5+).
 *
 * Layout: [sidebar 260px] | [main content] | [copilot drawer 380px overlay]
 *
 * Shortcuts:
 *   - Cmd/Ctrl+K → command palette
 *   - Cmd/Ctrl+I → toggle AI copilot
 *
 * Mobile: sidebar colapsa a drawer.
 *
 * El gate de consent legal NO se envuelve aquí: vive como pantalla dedicada
 * en `/onboarding/consent` y el `DashboardShell` redirige hacia ella si la
 * org no ha aceptado la versión vigente del consent.
 */

import { CopilotProvider } from '@/providers/copilot-provider'
import { UpgradeGateProvider } from '@/providers/upgrade-gate-provider'
import { CalculatorDrawerProvider } from '@/components/ui/calculator-drawer'
import { DashboardShell } from './_components/dashboard-shell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UpgradeGateProvider>
      <CopilotProvider>
        <CalculatorDrawerProvider>
          <DashboardShell>{children}</DashboardShell>
        </CalculatorDrawerProvider>
      </CopilotProvider>
    </UpgradeGateProvider>
  )
}
