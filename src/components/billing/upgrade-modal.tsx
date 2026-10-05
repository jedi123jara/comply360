'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Eye, Info, Lightbulb, X } from 'lucide-react'
import { PLANS, type PlanKey } from '@/lib/constants'
import { FEATURE_MIN_PLAN, planDisplayName, type PlanFeature } from '@/lib/plan-features'
import { track } from '@/lib/analytics'
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalOverlay,
  ModalPortal,
  ModalRoot,
  ModalTitle,
} from '@/components/ui/modal'
import { FEATURE_PREVIEW_COPY, GENERIC_PREVIEW_COPY } from './feature-preview-copy'

/**
 * UpgradeModal — "vista previa" didáctica de una función de un plan superior.
 *
 * En vez de un muro de venta, explica en lenguaje simple:
 *  1. Qué hace la función (2-3 líneas).
 *  2. Un ejemplo concreto de cómo te ayuda.
 *  3. Desde qué plan está disponible (el MÁS BARATO que la incluye) y su precio.
 *  4. Dos salidas claras: "Ver planes" y "Volver".
 *
 * Si se abre porque el servidor respondió 403 a mitad de carga, muestra un
 * aviso tranquilizador ("No es un error…") para que no parezca una falla.
 *
 * Controlado externamente vía props (gestionado por UpgradeGateProvider).
 */

/**
 * Por qué se abrió la vista previa:
 *  - `preview`: el usuario hizo clic en algo con candado (todavía no entró).
 *  - `locked-page`: entró a una sección bloqueada y el servidor la frenó al cargar.
 *  - `locked-action`: una acción puntual (botón) requiere un plan superior.
 */
export type UpgradeModalReason = 'preview' | 'locked-page' | 'locked-action'

export interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  /** Acción del botón "Volver". Por defecto solo cierra la vista previa. */
  onBack?: () => void
  currentPlan: PlanKey | 'FREE'
  /** Plan más barato que incluye la función (lo calcula `FEATURE_MIN_PLAN`). */
  requiredPlan: PlanKey
  /** Nombre de la opción que se intentó abrir (p. ej. el ítem del menú). */
  featureName?: string
  /** Feature key — para mostrar el texto didáctico correcto. */
  feature?: PlanFeature
  reason?: UpgradeModalReason
}

type PlanData = (typeof PLANS)[PlanKey]

function getPlanData(plan: string): PlanData | null {
  return (PLANS as Record<string, PlanData | undefined>)[plan] ?? null
}

function formatPrice(plan: PlanData | null): { amount: string; detail: string } {
  if (!plan) return { amount: 'Consultar', detail: 'Revisa el detalle en la página de planes' }
  if (plan.isCustomQuote) return { amount: 'A medida', detail: 'Cotización según el tamaño de tu empresa' }
  if (plan.price === 0) return { amount: 'Gratis', detail: 'Sin tarjeta de crédito' }
  return { amount: `S/ ${plan.price.toLocaleString('en-US')}`, detail: 'al mes + IGV' }
}

function reassuranceText(
  reason: UpgradeModalReason,
  requiredName: string,
  currentName: string,
): string | null {
  if (reason === 'locked-page') {
    return `No es un error. Esta sección es parte del plan ${requiredName} y tu plan actual es ${currentName}. Tu información está a salvo.`
  }
  if (reason === 'locked-action') {
    return `No es un error. Esta acción es parte del plan ${requiredName}, por eso no se realizó. Tu información está a salvo.`
  }
  return null
}

export function UpgradeModal({
  open,
  onClose,
  onBack,
  currentPlan,
  requiredPlan,
  featureName,
  feature,
  reason = 'preview',
}: UpgradeModalProps) {
  const requiredData = getPlanData(requiredPlan)
  const requiredName = planDisplayName(requiredPlan)
  const currentName = planDisplayName(currentPlan)
  const price = formatPrice(requiredData)

  const copy = feature ? FEATURE_PREVIEW_COPY[feature] : null
  const title = featureName ?? copy?.title ?? GENERIC_PREVIEW_COPY.title
  const summary = copy?.summary ?? GENERIC_PREVIEW_COPY.summary
  const example = copy?.example ?? null
  // Si el usuario hizo clic en un sub-ítem ("Exámenes médicos (EMO)"), le
  // contamos a qué módulo pertenece para que entienda el contexto.
  const partOf = copy && featureName && featureName !== copy.title ? copy.title : null
  const notice = reassuranceText(reason, requiredName, currentName)

  function handleSeePlans() {
    track('plan_upgrade_cta_clicked', {
      required_plan: requiredPlan,
      current_plan: currentPlan,
      feature: feature ?? null,
      reason,
    })
    onClose()
  }

  return (
    <ModalRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <ModalPortal>
        <ModalOverlay />
        <ModalContent size="lg" className="flex flex-col p-0 sm:max-w-xl">
          {/* Encabezado */}
          <div
            className="relative shrink-0 px-6 pt-6 pb-5 text-white sm:px-7"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
            }}
          >
            <ModalClose asChild>
              <button
                type="button"
                aria-label="Cerrar"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </ModalClose>

            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-50">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Vista previa · Plan {requiredName}
            </p>

            <ModalTitle className="pr-10 text-2xl font-semibold leading-tight tracking-tight">
              {title}
            </ModalTitle>
            {partOf ? (
              <p className="mt-1.5 text-sm text-blue-100">Forma parte de: {partOf}</p>
            ) : null}
          </div>

          {/* Contenido */}
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            {notice ? (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-3.5 text-sm leading-relaxed text-[color:var(--text-secondary)]"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                <span>{notice}</span>
              </div>
            ) : null}

            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Qué hace
              </h3>
              <ModalDescription className="text-[15px] leading-relaxed text-[color:var(--text-primary)]">
                {summary}
              </ModalDescription>
            </section>

            {example ? (
              <section
                className="flex items-start gap-3 rounded-xl border p-4"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(245, 158, 11, 0.16)', color: '#b45309' }}
                  aria-hidden="true"
                >
                  <Lightbulb className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="mb-0.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                    Por ejemplo
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
                    {example}
                  </p>
                </div>
              </section>
            ) : null}

            {/* Plan que la incluye */}
            <section className="rounded-xl border border-[color:var(--border-default)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[color:var(--text-tertiary)]">
                    Disponible desde el plan
                  </p>
                  <p className="text-xl font-semibold text-[color:var(--text-primary)]">
                    {requiredName}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-xl font-semibold text-[color:var(--text-primary)]"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {price.amount}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">{price.detail}</p>
                </div>
              </div>
              {currentPlan !== requiredPlan ? (
                <p className="mt-3 border-t border-[color:var(--border-subtle)] pt-3 text-xs text-[color:var(--text-tertiary)]">
                  Tu plan actual: <span className="font-semibold">{currentName}</span>. En la página
                  de planes puedes comparar todo lo que incluye cada uno.
                </p>
              ) : null}
            </section>
          </div>

          {/* Acciones */}
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onBack ?? onClose}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-2.5 text-sm font-semibold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </button>
            <Link
              href={`/dashboard/planes?highlight=${requiredPlan}`}
              onClick={handleSeePlans}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2"
            >
              Ver planes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </ModalContent>
      </ModalPortal>
    </ModalRoot>
  )
}

/**
 * Helper: deriva el plan requerido a partir de una feature key
 * (el plan más barato que la incluye).
 */
export function featureRequiredPlan(feature: PlanFeature): string {
  return FEATURE_MIN_PLAN[feature] ?? 'PRO'
}
