'use client'

import type { MouseEvent } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Building2,
  Check,
  Crown,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import { PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  FEATURED_MARKETING_PLAN,
  FULL_PLAN_ORDER,
  LANDING_PLAN_ORDER,
  PLAN_POSITIONING,
  cleanPlanFeature,
  getMarketingPlanLimit,
  getMarketingPlanOutcome,
  getMarketingPlanPrice,
  type MarketingPlanKey,
} from '@/lib/marketing-pricing'

type PricingGridVariant = 'landing' | 'plans'

const PLAN_ICONS: Record<MarketingPlanKey, LucideIcon> = {
  FREE: Star,
  STARTER: Building2,
  PRO: Rocket,
  EMPRESA: ShieldCheck,
  ENTERPRISE: Crown,
}

/**
 * Estilo del tema público (ver `public-theme.ts`): tarjetas blancas con borde
 * #E5EAF2, íconos azules en cuadro #EFF4FF y plan destacado con borde, etiqueta
 * y botón ámbar. Colores en hex arbitrario para no depender de la capa de
 * compatibilidad oscura de `globals.css`.
 */
const PLAN_ICON_STYLES: Record<MarketingPlanKey, string> = {
  FREE: 'bg-[#F5F7FB] text-[#475569] ring-[#E5EAF2]',
  STARTER: 'bg-[#EFF4FF] text-[#2563EB] ring-[#2563EB]/15',
  PRO: 'bg-[#EFF4FF] text-[#2563EB] ring-[#2563EB]/15',
  EMPRESA: 'bg-[#EFF4FF] text-[#2563EB] ring-[#2563EB]/15',
  ENTERPRISE: 'bg-[#FFF8E6] text-[#B45309] ring-[#F5B301]/35',
}

export function MarketingPricingGrid({
  variant = 'landing',
  includeFree = false,
  includeEnterprise = false,
  featuredPlan = FEATURED_MARKETING_PLAN,
  ctaHref = '/sign-up',
  signedIn = false,
  featureLimit,
  className,
  onPlanClick,
}: {
  variant?: PricingGridVariant
  includeFree?: boolean
  includeEnterprise?: boolean
  featuredPlan?: MarketingPlanKey
  ctaHref?: string
  signedIn?: boolean
  featureLimit?: number
  className?: string
  onPlanClick?: (plan: MarketingPlanKey) => (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const order = (variant === 'plans' ? FULL_PLAN_ORDER : LANDING_PLAN_ORDER).filter((key) => {
    if (key === 'FREE') return includeFree
    if (key === 'ENTERPRISE') return includeEnterprise
    return true
  })

  return (
    <div
      className={cn(
        'grid gap-4',
        variant === 'plans' ? 'lg:grid-cols-3 2xl:grid-cols-5' : 'lg:grid-cols-3',
        order.length === 4 ? 'xl:grid-cols-4' : null,
        className,
      )}
    >
      {order.map((planKey) => (
        <MarketingPricingCard
          key={planKey}
          planKey={planKey}
          featured={planKey === featuredPlan}
          ctaHref={ctaHref}
          signedIn={signedIn}
          featureLimit={featureLimit ?? (variant === 'plans' ? 7 : 6)}
          onClick={onPlanClick?.(planKey)}
        />
      ))}
    </div>
  )
}

function MarketingPricingCard({
  planKey,
  featured,
  ctaHref,
  signedIn,
  featureLimit,
  onClick,
}: {
  planKey: MarketingPlanKey
  featured: boolean
  ctaHref: string
  signedIn: boolean
  featureLimit: number
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const plan = PLANS[planKey]
  const Icon = PLAN_ICONS[planKey]
  const href = planKey === 'ENTERPRISE' ? 'mailto:contacto@comply360.pe?subject=Plan%20Enterprise%20Comply360' : ctaHref
  const price = getMarketingPlanPrice(planKey)
  const isEnterprise = planKey === 'ENTERPRISE'
  const cta = signedIn
    ? 'Ir al producto'
    : isEnterprise
      ? 'Hablar con ventas'
      : planKey === 'FREE'
        ? 'Crear cuenta gratis'
        : featured
          ? 'Empezar con Pro'
          : 'Empezar ahora'

  return (
    <article
      className={cn(
        'group relative flex min-h-[560px] flex-col overflow-hidden rounded-xl border bg-[#ffffff] p-5 text-[#475569] transition duration-200',
        featured
          ? 'border-2 border-[#F5B301] shadow-[0_24px_60px_rgba(245,179,1,0.18),0_8px_24px_rgba(11,27,54,0.08)]'
          : 'border-[#E5EAF2] shadow-[0_1px_2px_rgba(11,27,54,0.04),0_8px_24px_rgba(11,27,54,0.06)] hover:-translate-y-0.5 hover:border-[#2563EB]/35',
      )}
    >
      {featured ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-[#F5B301] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B1B36] shadow-[0_8px_20px_rgba(245,179,1,0.3)]">
          <Sparkles className="h-3 w-3" />
          Más elegido
        </div>
      ) : null}

      <div className="relative z-10 flex flex-1 flex-col">
        <div
          className={cn(
            'mb-5 flex h-11 w-11 items-center justify-center rounded-lg ring-1',
            PLAN_ICON_STYLES[planKey],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="pr-24">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">
            {getMarketingPlanLimit(planKey)}
          </p>
          <h3 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">{plan.name}</h3>
          <p className="mt-2 min-h-[44px] text-sm font-medium leading-6 text-[#475569]">
            {PLAN_POSITIONING[planKey].tagline}
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-end gap-2">
            <span
              className={cn(
                'font-extrabold leading-none tracking-[-0.02em] text-[#0B1B36]',
                isEnterprise ? 'text-3xl' : 'text-4xl',
              )}
            >
              {price}
            </span>
            {plan.price !== 0 || isEnterprise ? (
              <span className="pb-1 text-sm font-semibold text-[#5A6A80]">/mes</span>
            ) : null}
          </div>
          <p className="mt-3 min-h-[48px] text-sm font-medium leading-6 text-[#475569]">
            {getMarketingPlanOutcome(planKey)}
          </p>
        </div>

        <ul className="mt-6 grid flex-1 gap-3 border-t border-[#E5EAF2] pt-6">
          {plan.features.slice(0, featureLimit).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm font-medium leading-5 text-[#475569]">
              <Check className="mt-0.5 h-4 w-4 flex-none text-[#2563EB]" />
              <span>{cleanPlanFeature(feature)}</span>
            </li>
          ))}
        </ul>

        <Link
          href={href}
          onClick={onClick}
          className={cn(
            'mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition duration-150',
            featured
              ? 'bg-[#F5B301] text-[#0B1B36] shadow-[0_10px_24px_rgba(245,179,1,0.28)] hover:-translate-y-px hover:bg-[#E0A100]'
              : 'border border-[#0B1B36] bg-[#ffffff] text-[#0B1B36] hover:bg-[#0B1B36] hover:text-[#ffffff]',
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}
