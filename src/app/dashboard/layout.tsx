'use client'

/**
 * Dashboard layout — orquesta los providers globales del dashboard
 * (Upgrade gate, Copilot, Calculator drawer, Consent) y delega la UI a
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
 */

import { CopilotProvider } from '@/providers/copilot-provider'
import { UpgradeGateProvider } from '@/providers/upgrade-gate-provider'
import { CalculatorDrawerProvider } from '@/components/ui/calculator-drawer'
import { ConsentGate } from '@/components/legal/consent-modal'
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
          {/* ConsentGate bloquea el dashboard hasta que el admin acepte T&C + privacidad + DPA */}
          <ConsentGate scope="org">
            <DashboardShell>{children}</DashboardShell>
          </ConsentGate>
        </CalculatorDrawerProvider>
      </CopilotProvider>
    </UpgradeGateProvider>
  )
}
