'use client'

/**
 * ElegirPlanClient — UI del plan picker post-onboarding.
 *
 * Layout:
 *   - Hero "Elige tu plan, {orgName}"
 *   - Recomendación según sizeRange (highlight visual del plan sugerido)
 *   - Grid de 4 cards: FREE | STARTER | EMPRESA ★ | PRO
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
import { Check, Sparkles, Building2, Zap, Rocket, Star, ArrowRight, CreditCard, Clock, Loader2, Gem, MessageCircle } from 'lucide-react'
import { PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner-toaster'

type PaidPlan = 'STARTER' | 'EMPRESA' | 'PRO' | 'BUSINESS'
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
  EMPRESA: { icon: Zap, tagline: 'El plan más elegido — compliance completo', cta: 'Iniciar 14 días gratis' },
  PRO: { icon: Rocket, tagline: 'Para empresas que escalan con IA', cta: 'Iniciar 14 días gratis' },
  BUSINESS: { icon: Gem, tagline: 'Multi-empresa + soporte para empresas grandes', cta: 'Iniciar 14 días gratis' },
  ENTERPRISE: { icon: Sparkles, tagline: 'Holdings, gobierno y +1,000 trabajadores', cta: 'Solicitar cotización' },
}

const ORDER: PlanKey[] = ['FREE', 'STARTER', 'EMPRESA', 'PRO', 'BUSINESS']

// WhatsApp de ventas para ENTERPRISE — mismo que /planes
const SALES_WHATSAPP_NUMBER = '51999999999'

/**
 * Recomienda el plan basado en sizeRange del onboarding.
 * Mapping:
 *   1-10 → STARTER (MYPE)
 *   11-100 → EMPRESA
 *   101-300 → PRO (la IA sale a cuenta)
 *   301-750 → BUSINESS (multi-empresa)
 *   750+ → ENTERPRISE (custom — UX te muestra "Cotizar")
 */
function recommendPlan(sizeRange: string | null): PlanKey {
  if (!sizeRange) return 'EMPRESA'
  if (sizeRange === '1-10') return 'STARTER'
  if (sizeRange === '11-50' || sizeRange === '51-100') return 'EMPRESA'
  if (sizeRange === '101-200') return 'PRO'
  if (sizeRange === '200+') return 'BUSINESS'
  return 'EMPRESA'
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-emerald-200 mb-5">
            <Sparkles className="w-3 h-3" />
            Sin tarjeta de crédito · Cancela cuando quieras
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Elige tu plan, <span className="text-emerald-600">{orgName.split(' ')[0]}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Tu trial de 14 días arranca al elegir. Si te gusta, sigues; si no, no te cobramos nada.
          </p>
          {sizeRange ? (
            <p className="mt-3 text-xs text-slate-500">
              Para empresas de <strong>{sizeRange.replace('-', ' a ').replace('+', ' o más')} trabajadores</strong>{' '}
              recomendamos el plan <strong className="text-emerald-700">{recommended}</strong>.
            </p>
          ) : null}
        </div>

        {/* Plan grid — 5 cards (FREE | STARTER | EMPRESA ★ | PRO | BUSINESS) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  'relative rounded-2xl p-5 sm:p-6 flex flex-col bg-white transition-all',
                  isRecommended
                    ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-100 scale-[1.02]'
                    : 'ring-1 ring-slate-200 shadow-sm hover:shadow-md hover:ring-slate-300',
                )}
              >
                {isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ring-2 ring-white">
                    Recomendado para ti
                  </span>
                )}

                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center mb-4',
                    isRecommended ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700',
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">{meta.tagline}</p>

                <div className="mb-1">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">
                    {plan.price === 0 ? 'Gratis' : `S/ ${plan.price.toLocaleString('es-PE')}`}
                  </span>
                  {plan.price !== 0 && <span className="text-sm text-slate-500"> /mes</span>}
                </div>
                {!isFree && (
                  <p className="text-[11px] text-slate-500 mb-5">
                    Hasta {plan.maxWorkers} trabajadores · IGV incluido
                  </p>
                )}
                {isFree && <p className="text-[11px] text-slate-500 mb-5">Para siempre · 5 trabajadores demo</p>}

                <ul className="space-y-2 text-xs flex-1 mb-5">
                  {plan.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                {isFree ? (
                  <button
                    onClick={handleStartFree}
                    disabled={isLoadingThis}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors disabled:opacity-50"
                  >
                    {isLoadingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {meta.cta}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* CTA primary: trial gratis */}
                    <button
                      onClick={() => handleStartTrial(key as PaidPlan)}
                      disabled={isLoadingThis || isPayLoadingThis}
                      className={cn(
                        'w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold text-sm px-4 py-2.5 transition-colors disabled:opacity-50',
                        isRecommended
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white',
                      )}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {meta.cta}
                    </button>

                    {/* CTA secondary: pagar ahora -20% */}
                    <button
                      onClick={() => handlePayNow(key as PaidPlan)}
                      disabled={isLoadingThis || isPayLoadingThis}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl font-medium text-xs px-4 py-2 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      title={`Pagar S/ ${(plan.price * 0.8).toFixed(0)} ahora (20% off el primer mes)`}
                    >
                      {isPayLoadingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CreditCard className="w-3 h-3" />
                      )}
                      Pagar ya y ahorrar 20%
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Enterprise — card grande dedicada con CTA "Cotizar" */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 ring-1 ring-amber-500/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/40">
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg sm:text-xl font-bold">Enterprise</h3>
                <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ring-1 ring-amber-500/40">
                  Custom · Cotizar
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Para empresas con <strong className="text-white">+1,000 trabajadores</strong>, holdings con
                múltiples RUCs, gobierno, banca o cualquier organización que necesite SLA garantizado,
                API REST, multi-tenant ilimitado, Customer Success Manager dedicado y branding white-label.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Te respondemos por WhatsApp en menos de 4 horas hábiles.
              </p>
            </div>
            <Link
              href={`https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Comply360, soy ${orgName} y me interesa el plan Enterprise. Tenemos aprox ____ trabajadores.`)}`}
              target="_blank"
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold text-sm px-5 py-3 transition-colors w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4" />
              Solicitar cotización
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { title: 'Sin tarjeta de crédito', body: 'El trial de 14 días arranca sin pedirte tarjeta. Te avisamos 3 días antes de cobrar.' },
            { title: 'Cancela cuando quieras', body: 'Un click en tu dashboard y listo. No hay letras chicas ni penalidad.' },
            { title: 'Migración gratuita', body: '¿Vienes de Buk u Ofisis? Te importamos workers + contratos en menos de 24h.' },
          ].map((item, i) => (
            <div key={i} className="rounded-xl bg-white ring-1 ring-slate-200 p-4 text-center">
              <h4 className="text-sm font-semibold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-12 text-center text-xs text-slate-500">
          Email del responsable: <strong className="text-slate-700">{alertEmail || 'sin configurar'}</strong>
          {' · '}
          Lo cambias después en{' '}
          <Link href="/dashboard/configuracion" className="underline">Configuración</Link>.
        </p>
      </div>
    </div>
  )
}
