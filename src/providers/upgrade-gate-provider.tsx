'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UpgradeModal, type UpgradeModalReason } from '@/components/billing/upgrade-modal'
import type { PlanKey } from '@/lib/constants'
import {
  FEATURE_MIN_PLAN,
  getRouteFeature,
  planHasFeature,
  type PlanFeature,
} from '@/lib/plan-features'
import { track } from '@/lib/analytics'

/**
 * UpgradeGateProvider — muestra la "vista previa" de funciones de un plan superior.
 *
 * Dos formas de abrirla:
 *  1. Manual (`useUpgradeGate().openUpgrade`): clic en un ítem con candado del
 *     sidebar, tooltips, etc. El usuario aún no entró a la sección.
 *  2. Automática: parchea `window.fetch` y detecta 403 `PLAN_UPGRADE_REQUIRED`
 *     emitidos por `withPlanGate`. Pasa cuando el usuario llega a una sección
 *     bloqueada por un enlace directo, o pulsa un botón de un plan superior.
 *
 * En el caso automático:
 *  - Si la ruta actual es una sección bloqueada, se muestra la vista previa de
 *    ESA función con el aviso "No es un error…", y "Volver" regresa a la
 *    página anterior (la sección no sirve sin el plan).
 *  - Si la ruta es libre (falló solo una acción), "Volver" solo cierra.
 *  - Varios 403 en paralelo (una página que carga 5 APIs) abren UNA sola vista.
 *  - Si el usuario la cerró, no se vuelve a abrir sola en la misma sección.
 */

interface UpgradeGateState {
  open: boolean
  currentPlan: PlanKey | 'FREE'
  requiredPlan: PlanKey
  feature?: PlanFeature
  featureName?: string
  reason: UpgradeModalReason
  /** Ruta en la que se abrió: si el usuario navega, la vista previa se oculta. */
  path: string
}

interface OpenUpgradeArgs {
  requiredPlan: PlanKey
  currentPlan?: PlanKey | 'FREE'
  feature?: PlanFeature
  featureName?: string
  /** Por defecto `preview` (apertura manual). */
  reason?: UpgradeModalReason
}

interface UpgradeGateContext {
  openUpgrade: (args: OpenUpgradeArgs) => void
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

const INITIAL_STATE: UpgradeGateState = {
  open: false,
  currentPlan: 'FREE',
  requiredPlan: 'PRO',
  reason: 'preview',
  path: '',
}

export function UpgradeGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [state, setState] = useState<UpgradeGateState>(INITIAL_STATE)

  // Si el usuario cambia de ruta (p. ej. con "atrás" del navegador), la vista
  // previa abierta ya no corresponde a lo que tiene en pantalla: se cierra.
  // Patrón "ajustar estado durante el render" (sin efecto intermedio).
  const [trackedPath, setTrackedPath] = useState(pathname)
  if (trackedPath !== pathname) {
    setTrackedPath(pathname)
    if (state.open) setState({ ...state, open: false })
  }

  // Refs para leer lo más reciente desde el fetch parcheado (vive fuera del
  // ciclo de render) y para deduplicar 403 que llegan en paralelo.
  const stateRef = useRef<UpgradeGateState>(INITIAL_STATE)
  const pathnameRef = useRef(pathname)
  /** Sección bloqueada cuya vista previa el usuario ya cerró. */
  const dismissedPathRef = useRef<string | null>(null)

  // Layout effect: se sincroniza en el mismo commit de la navegación, antes de
  // que cualquier respuesta 403 de la página nueva llegue al fetch parcheado.
  useLayoutEffect(() => {
    if (pathnameRef.current === pathname) return
    pathnameRef.current = pathname
    dismissedPathRef.current = null
    // Acompaña al cierre hecho durante el render (arriba).
    if (stateRef.current.open) stateRef.current = { ...stateRef.current, open: false }
  }, [pathname])

  // Todo cambio pasa por aquí: el ref se actualiza al instante (dedupe de 403
  // simultáneos, que llegan antes del siguiente render) junto con el estado.
  const applyState = useCallback((next: UpgradeGateState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const close = useCallback(() => {
    const current = stateRef.current
    if (!current.open) return
    if (current.reason === 'locked-page') dismissedPathRef.current = current.path
    applyState({ ...current, open: false })
  }, [applyState])

  const openUpgrade = useCallback(
    (args: OpenUpgradeArgs) => {
      const reason = args.reason ?? 'preview'
      track('plan_upgrade_modal_shown', {
        required_plan: args.requiredPlan,
        current_plan: args.currentPlan ?? 'FREE',
        feature: args.feature ?? null,
        reason,
      })
      applyState({
        open: true,
        requiredPlan: args.requiredPlan,
        currentPlan: args.currentPlan ?? 'FREE',
        feature: args.feature,
        featureName: args.featureName,
        reason,
        path: pathnameRef.current,
      })
    },
    [applyState],
  )

  /** "Volver": en una sección bloqueada regresa a la página anterior. */
  const handleBack = useCallback(() => {
    const wasLockedPage = stateRef.current.reason === 'locked-page'
    close()
    if (!wasLockedPage) return
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/dashboard')
  }, [close, router])

  // Patch fetch to catch 403 PLAN_UPGRADE_REQUIRED globally
  useEffect(() => {
    if (typeof window === 'undefined') return
    const original = window.fetch

    function handlePlanDenied(data: UpgradeResponse) {
      const requiredPlan = (data.requiredPlan ?? 'PRO') as PlanKey
      const currentPlan = (data.currentPlan ?? 'FREE') as PlanKey | 'FREE'
      const path = pathnameRef.current

      // ¿La sección actual completa está bloqueada para este plan?
      const routeFeature = getRouteFeature(path)
      const pageLocked = routeFeature !== null && !planHasFeature(currentPlan, routeFeature)

      // Una sola vista previa aunque fallen varias APIs a la vez.
      const current = stateRef.current
      if (current.open && current.path === path) return
      // Ya la vio y la cerró en esta sección: no insistir con cada recarga.
      if (pageLocked && dismissedPathRef.current === path) return

      openUpgrade({
        requiredPlan,
        currentPlan,
        // Solo usamos el texto de la sección si coincide con el plan que pidió
        // el servidor; si no, mostramos el texto genérico (nunca uno engañoso).
        feature:
          pageLocked && routeFeature && FEATURE_MIN_PLAN[routeFeature] === requiredPlan
            ? routeFeature
            : undefined,
        reason: pageLocked ? 'locked-page' : 'locked-action',
      })
    }

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
        if (data?.code === 'PLAN_UPGRADE_REQUIRED') handlePlanDenied(data)
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
        onBack={handleBack}
        currentPlan={state.currentPlan}
        requiredPlan={state.requiredPlan}
        feature={state.feature}
        featureName={state.featureName}
        reason={state.reason}
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
