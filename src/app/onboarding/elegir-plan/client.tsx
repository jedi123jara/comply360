'use client'

/**
 * ElegirPlanClient — UI del plan picker post-onboarding.
 *
 * Layout:
 *   - Hero "Elige tu plan, {orgName}"
 *   - Recomendación según sizeRange (highlight visual del plan sugerido)
 *   - Grid de 4 cards: FREE | STARTER | PRO ★ | EMPRESA
 *   - ENTERPRISE como link inferior "¿más de 300 trabajadores? Hablar con ventas"
 *   - Cada plan paid tiene 2 CTAs: trial gratis (default) + pagar -20%
 *   - Plan FREE tiene 1 CTA: "Continuar gratis"
 *   - Modal Culqi se abre al click "Pagar ahora"
 *
 * Decisiones UX:
 *   - El plan recomendado está pre-seleccionado visualmente
 *   - El precio mostrado es el FULL — el descuento se ve dentro del CTA
 *   - "Sin tarjeta" prominente para reducir fricción
 *   - "Cancela cuando quieras" debajo del precio
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Sparkles, Building2, Zap, Rocket, Star, ArrowRight, CreditCard, Clock, Loader2, MessageCircle } from 'lucide-react'
import { PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner-toaster'
import { formatSolesMarketing } from '@/lib/format/peruvian'
import { PublicHero } from '@/components/marketing/public-hero'
import { PublicShell } from '@/components/marketing/public-shell'
import { pub } from '@/components/marketing/public-theme'

type PaidPlan = 'STARTER' | 'PRO' | 'EMPRESA'
type PlanKey = 'FREE' | PaidPlan | 'ENTERPRISE'

interface Props {
  orgName: string
  sizeRange: string | null
  alertEmail: string
}

const PLAN_META: Record<PlanKey, {
  icon: typeof Building2
  tagline: string
  cta: string
}> = {
  FREE: { icon: Star, tagline: 'Para probar las herramientas gratis', cta: 'Continuar gratis' },
  STARTER: { icon: Building2, tagline: 'Ideal para MYPE de hasta 20 trabajadores', cta: 'Iniciar 14 días gratis' },
  PRO: { icon: Rocket, tagline: 'Más elegido: IA, SST y SUNAFIL', cta: 'Iniciar 14 días gratis' },
  EMPRESA: { icon: Zap, tagline: 'Multi-sede + portal trabajador', cta: 'Iniciar 14 días gratis' },
  ENTERPRISE: { icon: Sparkles, tagline: 'Holdings, corporativos y 300+ trabajadores', cta: 'Solicitar cotización' },
}

const ORDER: PlanKey[] = ['FREE', 'STARTER', 'PRO', 'EMPRESA']

// WhatsApp de ventas para ENTERPRISE — mismo que /planes
const SALES_WHATSAPP_NUMBER = '51999999999'

/**
 * Recomienda el plan basado en sizeRange del onboarding.
 * Mapping:
 *   1-10 → STARTER (MYPE)
 *   11-100 → PRO (sweet spot)
 *   101+ → EMPRESA (multi-sede / operación más compleja)
 */
function recommendPlan(sizeRange: string | null): PlanKey {
  if (!sizeRange) return 'PRO'
  if (sizeRange === '1-10') return 'STARTER'
  if (sizeRange === '11-50' || sizeRange === '51-100') return 'PRO'
  if (sizeRange === '101-200' || sizeRange === '200+') return 'EMPRESA'
  return 'PRO'
}

export function ElegirPlanClient({ orgName, sizeRange, alertEmail }: Props) {
  const router = useRouter()
  const recommended = recommendPlan(sizeRange)
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null)
  const [paidLoading, setPaidLoading] = useState<PaidPlan | null>(null)

  async function handleStartTrial(plan: PaidPlan) {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/subscriptions/start-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No pudimos iniciar el trial')
        return
      }
      toast.success(`✓ Trial ${plan} activado por 14 días`)
      router.push(data.redirect ?? '/dashboard?welcome=trial')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar trial')
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handleStartFree() {
    setLoadingPlan('FREE')
    try {
      const res = await fetch('/api/subscriptions/start-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Error al continuar gratis')
        return
      }
      const data = await res.json()
      toast.success('✓ Plan gratuito activado. ¡Bienvenido!')
      router.push(data.redirect ?? '/dashboard?welcome=free')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al continuar')
    } finally {
      setLoadingPlan(null)
    }
  }

  function handlePayNow(plan: PaidPlan) {
    setPaidLoading(plan)
    // TODO Sprint 7+: integrar Culqi.js modal aquí.
    // Por ahora, redirigimos al checkout existente.
    setTimeout(() => {
      setPaidLoading(null)
      router.push(`/dashboard/planes?upgrade=${plan}&discount=20`)
    }, 600)
  }

  return (
    <PublicShell header="minimal" footer={false}>
      {/* Hero */}
      <PublicHero
        eyebrow={
          <>
            <Sparkles aria-hidden className="h-3 w-3" />
            Sin tarjeta de crédito · Cancela cuando quieras
          </>
        }
        title={
          <>
            Elige tu plan, <span className={pub.highlightOnNavy}>{orgName.split(' ')[0]}</span>
          </>
        }
        description="Tu trial de 14 días arranca al elegir. Si te gusta, sigues; si no, no te cobramos nada."
      >
        {sizeRange ? (
          <p className={cn(pub.faintOnNavy, 'mt-3 text-[#CBD5E1]')}>
            Para empresas de <strong className="text-[#ffffff]">{sizeRange.replace('-', ' a ').replace('+', ' o más')} trabajadores</strong>{' '}
            recomendamos el plan <strong className="text-[#F5B301]">{recommended}</strong>.
          </p>
        ) : null}
      </PublicHero>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Plan grid — FREE | STARTER | PRO ★ | EMPRESA */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((key) => {
            const plan = PLANS[key]
            const meta = PLAN_META[key]
            const Icon = meta.icon
            const isRecommended = key === recommended
            const isFree = key === 'FREE'
            const isLoadingThis = loadingPlan === key
            const isPayLoadingThis = paidLoading === key

            return (
              <div
                key={key}
                className={cn(
                  'relative flex flex-col rounded-xl bg-[#ffffff] p-5 transition-all sm:p-6',
                  isRecommended
                    ? 'border-2 border-[#F5B301] shadow-[0_24px_60px_rgba(245,179,1,0.18),0_8px_24px_rgba(11,27,54,0.08)] lg:scale-[1.02]'
                    : 'border border-[#E5EAF2] shadow-[0_1px_2px_rgba(11,27,54,0.04),0_8px_24px_rgba(11,27,54,0.06)] hover:border-[#2563EB]/35',
                )}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#F5B301] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0B1B36] ring-2 ring-[#ffffff]">
                    Recomendado para ti
                  </span>
                )}

                <div
                  className={cn(
                    'mb-4 flex h-11 w-11 items-center justify-center rounded-lg',
                    isRecommended ? 'bg-[#FFF8E6] text-[#B45309]' : 'bg-[#EFF4FF] text-[#2563EB]',
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </div>

                <h3 className="text-base font-extrabold tracking-[-0.01em] text-[#0B1B36]">{plan.name}</h3>
                <p className="mb-4 mt-0.5 text-xs text-[#5A6A80]">{meta.tagline}</p>

                <div className="mb-1">
                  <span className="text-2xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">
                    {plan.price === 0 ? 'Gratis' : formatSolesMarketing(plan.price)}
                  </span>
                  {plan.price !== 0 && <span className="text-sm text-[#5A6A80]"> /mes</span>}
                </div>
                {!isFree && (
                  <p className="mb-5 text-[11px] text-[#5A6A80]">
                    Hasta {plan.maxWorkers} trabajadores · IGV incluido
                  </p>
                )}
                {isFree && <p className="mb-5 text-[11px] text-[#5A6A80]">Para siempre · 5 trabajadores demo</p>}

                <ul className="mb-5 flex-1 space-y-2 text-xs">
                  {plan.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[#475569]">
                      <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#2563EB]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                {isFree ? (
                  <button
                    onClick={handleStartFree}
                    disabled={isLoadingThis}
                    className={cn(pub.btnSecondary, 'w-full rounded-xl px-4')}
                  >
                    {isLoadingThis ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : null}
                    {meta.cta}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* CTA primary: trial gratis */}
                    <button
                      onClick={() => handleStartTrial(key as PaidPlan)}
                      disabled={isLoadingThis || isPayLoadingThis}
                      className={cn(
                        'w-full rounded-xl px-4',
                        isRecommended ? pub.btnPrimary : pub.btnSecondary,
                      )}
                    >
                      {isLoadingThis ? (
                        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Clock aria-hidden className="h-3.5 w-3.5" />
                      )}
                      {meta.cta}
                    </button>

                    {/* CTA secondary: pagar ahora -20% */}
                    <button
                      onClick={() => handlePayNow(key as PaidPlan)}
                      disabled={isLoadingThis || isPayLoadingThis}
                      className={cn(pub.btnTertiary, 'w-full rounded-xl')}
                      title={`Pagar ${formatSolesMarketing(Math.round(plan.price * 0.8))} ahora (20% off el primer mes)`}
                    >
                      {isPayLoadingThis ? (
                        <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
                      ) : (
                        <CreditCard aria-hidden className="h-3 w-3" />
                      )}
                      Pagar ya y ahorrar 20%
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Enterprise — banda navy con CTA "Cotizar" */}
        <div className={cn(pub.band, 'mt-8 p-6 sm:p-8')}>
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F5B301]/15 ring-1 ring-[#F5B301]/40">
              <Sparkles aria-hidden className="h-6 w-6 text-[#F5B301]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-[-0.02em] text-[#ffffff] sm:text-xl">Enterprise</h3>
                <span className="rounded-full bg-[#F5B301]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F5B301] ring-1 ring-[#F5B301]/40">
                  Custom · Cotizar
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#CBD5E1]">
                Para empresas con <strong className="text-[#ffffff]">300+ trabajadores</strong>, holdings con
                múltiples RUCs, corporativos o cualquier organización que necesite SLA garantizado,
                API REST, multi-tenant ilimitado y Customer Success Manager dedicado.
              </p>
              <p className="mt-2 text-xs text-[#94A3B8]">
                Te respondemos por WhatsApp en menos de 4 horas hábiles.
              </p>
            </div>
            <Link
              href={`https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Comply360, soy ${orgName} y me interesa el plan Enterprise. Tenemos aprox ____ trabajadores.`)}`}
              target="_blank"
              className={cn(pub.btnSecondaryOnNavy, 'w-full shrink-0 rounded-xl border-[#F5B301] py-3 text-[#F5B301] hover:bg-[#F5B301] hover:text-[#0B1B36] sm:w-auto')}
            >
              <MessageCircle aria-hidden className="h-4 w-4" />
              Solicitar cotización
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { title: 'Sin tarjeta de crédito', body: 'El trial de 14 días arranca sin pedirte tarjeta. Te avisamos 3 días antes de cobrar.' },
            { title: 'Cancela cuando quieras', body: 'Un click en tu dashboard y listo. No hay letras chicas ni penalidad.' },
            { title: 'Migración gratuita', body: '¿Vienes de Buk u Ofisis? Te importamos trabajadores y contratos en menos de 24 horas.' },
          ].map((item, i) => (
            <div key={i} className={cn(pub.card, 'p-4 text-center')}>
              <h4 className="mb-1 text-sm font-bold text-[#0B1B36]">{item.title}</h4>
              <p className="text-xs text-[#475569]">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-center text-xs text-[#5A6A80]">
          Email del responsable: <strong className="text-[#0B1B36]">{alertEmail || 'sin configurar'}</strong>
          {' · '}
          Lo cambias después en{' '}
          <Link href="/dashboard/configuracion" className={pub.link}>Configuración</Link>.
        </p>
      </div>
    </PublicShell>
  )
}
