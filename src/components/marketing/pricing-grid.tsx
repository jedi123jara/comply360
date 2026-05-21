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

const PLAN_ACCENTS: Record<MarketingPlanKey, string> = {
  FREE: 'from-slate-100 via-white to-slate-50',
  STARTER: 'from-cyan-50 via-white to-sky-50',
  PRO: 'from-teal-50 via-white to-blue-50',
  EMPRESA: 'from-amber-50 via-white to-teal-50',
  ENTERPRISE: 'from-slate-100 via-white to-amber-50',
}

const PLAN_ICON_STYLES: Record<MarketingPlanKey, string> = {
  FREE: 'bg-slate-100 text-slate-700 ring-slate-200',
  STARTER: 'bg-cyan-50 text-cyan-700 ring-cyan-200/80',
  PRO: 'bg-teal-50 text-teal-700 ring-teal-200/80',
  EMPRESA: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  ENTERPRISE: 'bg-amber-100 text-amber-800 ring-amber-300/80',
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
        'group relative flex min-h-[560px] flex-col overflow-hidden rounded-lg border p-5 transition duration-200',
        'bg-white text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.09)]',
        featured
          ? 'border-teal-400 ring-1 ring-teal-300'
          : 'border-slate-300 hover:border-teal-300',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 transition duration-200 group-hover:opacity-100',
          PLAN_ACCENTS[planKey],
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-blue-500 to-amber-300 opacity-70" />
      {featured ? (
        <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700 shadow-[0_10px_28px_rgba(20,184,166,0.14)]">
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-800">
            {getMarketingPlanLimit(planKey)}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{plan.name}</h3>
          <p className="mt-2 min-h-[44px] text-sm font-medium leading-6 text-slate-700">
            {PLAN_POSITIONING[planKey].tagline}
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-end gap-2">
            <span className={cn('font-serif font-medium leading-none text-slate-950', isEnterprise ? 'text-3xl' : 'text-4xl')}>
              {price}
            </span>
            {plan.price !== 0 || isEnterprise ? (
              <span className="pb-1 text-sm font-semibold text-slate-600">/mes</span>
            ) : null}
          </div>
          <p className="mt-3 min-h-[48px] text-sm font-medium leading-6 text-slate-700">
            {getMarketingPlanOutcome(planKey)}
          </p>
        </div>

        <ul className="mt-6 grid flex-1 gap-3 border-t border-slate-200 pt-6">
          {plan.features.slice(0, featureLimit).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm font-medium leading-5 text-slate-800">
              <Check className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
              <span>{cleanPlanFeature(feature)}</span>
            </li>
          ))}
        </ul>

        <Link
          href={href}
          onClick={onClick}
          className={cn(
            'mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition',
            featured
              ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-[0_18px_48px_rgba(20,184,166,0.22)] hover:shadow-[0_24px_60px_rgba(20,184,166,0.28)]'
              : 'border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-teal-200 hover:bg-teal-50',
          )}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}
