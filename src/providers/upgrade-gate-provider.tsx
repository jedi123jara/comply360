'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import type { PlanKey } from '@/lib/constants'
import type { PlanFeature } from '@/lib/plan-features'
import { track } from '@/lib/analytics'

/**
 * UpgradeGateProvider — interceptor global de 403 PLAN_UPGRADE_REQUIRED.
 *
 * Patch `window.fetch` para detectar respuestas 403 con código
 * `PLAN_UPGRADE_REQUIRED` emitidas por `withPlanGate`. Cuando detecta una,
 * abre el <UpgradeModal> automáticamente con el contexto del plan requerido.
 *
 * También expone `useUpgradeGate()` para disparos manuales desde UI
 * (clicks en features bloqueadas del sidebar, tooltips, etc.).
 */

interface UpgradeGateState {
  open: boolean
  currentPlan: PlanKey | 'FREE'
  requiredPlan: PlanKey
  feature?: PlanFeature
  featureName?: string
}

interface UpgradeGateContext {
  openUpgrade: (args: {
    requiredPlan: PlanKey
    currentPlan?: PlanKey | 'FREE'
    feature?: PlanFeature
    featureName?: string
  }) => void
  close: () => void
  state: UpgradeGateState
}

const Context = createContext<UpgradeGateContext | null>(null)

interface UpgradeResponse {
  error?: string
  code?: string
  requiredPlan?: string
  currentPlan?: string
  upgradeUrl?: string
}

export function UpgradeGateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpgradeGateState>({
    open: false,
    currentPlan: 'FREE',
    requiredPlan: 'EMPRESA',
  })

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  const openUpgrade = useCallback(
    (args: {
      requiredPlan: PlanKey
      currentPlan?: PlanKey | 'FREE'
      feature?: PlanFeature
      featureName?: string
    }) => {
      track('plan_upgrade_modal_shown', {
        required_plan: args.requiredPlan,
        current_plan: args.currentPlan ?? 'FREE',
        feature: args.feature ?? null,
      })
      setState({
        open: true,
        requiredPlan: args.requiredPlan,
        currentPlan: args.currentPlan ?? 'FREE',
        feature: args.feature,
        featureName: args.featureName,
      })
    },
    [],
  )

  // Patch fetch to catch 403 PLAN_UPGRADE_REQUIRED globally
  useEffect(() => {
    if (typeof window === 'undefined') return
    const original = window.fetch

    async function patched(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const response = await original(input, init)

      // Only inspect JSON 403s on API routes (same-origin)
      if (response.status !== 403) return response
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url && !url.includes('/api/')) return response
        // Clone so caller can still read the body
        const cloned = response.clone()
        const data: UpgradeResponse = await cloned.json().catch(() => ({}))
        if (data?.code === 'PLAN_UPGRADE_REQUIRED') {
          const requiredPlan = (data.requiredPlan ?? 'EMPRESA') as PlanKey
          const currentPlan = (data.currentPlan ?? 'FREE') as PlanKey | 'FREE'
          openUpgrade({ requiredPlan, currentPlan })
        }
      } catch {
        /* Non-JSON or network error — fall through */
      }
      return response
    }

    window.fetch = patched as typeof window.fetch
    return () => {
      window.fetch = original
    }
  }, [openUpgrade])

  const value = useMemo<UpgradeGateContext>(
    () => ({ openUpgrade, close, state }),
    [openUpgrade, close, state],
  )

  return (
    <Context.Provider value={value}>
      {children}
      <UpgradeModal
        open={state.open}
        onClose={close}
        currentPlan={state.currentPlan}
        requiredPlan={state.requiredPlan}
        feature={state.feature}
        featureName={state.featureName}
      />
    </Context.Provider>
  )
}

export function useUpgradeGate(): UpgradeGateContext {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error('useUpgradeGate must be used within <UpgradeGateProvider>')
  }
  return ctx
}
