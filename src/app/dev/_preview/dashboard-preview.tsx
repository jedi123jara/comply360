'use client'

/**
 * DashboardPreview — monta el shell REAL del dashboard en /dev/* sin sesión
 * ni base de datos.
 *
 * Replica el árbol de providers de `src/app/dashboard/layout.tsx`:
 *
 *   UpgradeGateProvider → CopilotProvider → CalculatorDrawerProvider
 *     → ConsentGate → DashboardShell (sidebar + topbar + palette + copiloto)
 *
 * Cómo evitamos Clerk y la base:
 *   - Clerk: el `SafeClerkProvider` del layout raíz ya envuelve /dev/*. Sin
 *     sesión, `useUser()` devuelve `user = null` y el topbar muestra "C3".
 *   - API/base: `activatePreviewApi()` intercepta `fetch('/api/...')` y
 *     responde con datos de ejemplo (ver ./mock-api.ts). Se activa en un
 *     `useLayoutEffect`, que corre ANTES que los `useEffect` de los hijos,
 *     así la primera petición del sidebar/topbar ya sale simulada (y el
 *     redirect de onboarding de DashboardShell nunca se dispara).
 */

import { useLayoutEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { FlaskConical } from 'lucide-react'
import { UpgradeGateProvider } from '@/providers/upgrade-gate-provider'
import { CopilotProvider } from '@/providers/copilot-provider'
import { CalculatorDrawerProvider } from '@/components/ui/calculator-drawer'
import { ConsentGate } from '@/components/legal/consent-modal'
import { DashboardShell } from '@/app/dashboard/_components/dashboard-shell'
import { activatePreviewApi } from './mock-api'
import '@/styles/dashboard-light.css'

export function DashboardPreview({ children }: { children: ReactNode }) {
  useLayoutEffect(() => activatePreviewApi(), [])

  return (
    <>
      <UpgradeGateProvider>
        <CopilotProvider>
          <CalculatorDrawerProvider>
            <ConsentGate scope="org">
              <DashboardShell>{children}</DashboardShell>
            </ConsentGate>
          </CalculatorDrawerProvider>
        </CopilotProvider>
      </UpgradeGateProvider>
      <PreviewPill />
    </>
  )
}

/** Marca fija para que nadie confunda la vista previa con datos reales. */
function PreviewPill() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-30 lg:left-[calc(var(--sidebar-width)+1rem)]">
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-[var(--elevation-2)] backdrop-blur">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Vista previa · datos de ejemplo</span>
        <span className="h-3 w-px bg-amber-200" aria-hidden="true" />
        <Link href="/dev" className="font-semibold underline-offset-2 hover:underline">
          Ver índice
        </Link>
      </div>
    </div>
  )
}
