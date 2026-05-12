'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * MomentCard — narrative "moments" of the current period.
 *
 * Three variants match the 3 narrative beats in the Cockpit:
 *   - `closed`: positive (emerald) — what you finished
 *   - `upcoming`: neutral/amber — what's coming
 *   - `risk`: crimson — what to prioritize
 *
 * Clickable (becomes a Link if `href` is set).
 */
export interface MomentCardProps {
  variant: 'closed' | 'upcoming' | 'risk'
  label: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  cta?: string
}

const VARIANT_STYLES: Record<
  MomentCardProps['variant'],
  { card: 'default' | 'emerald' | 'crimson'; badge: string; icon: string }
> = {
  closed: {
    card: 'emerald',
    badge: 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300',
    icon: 'text-emerald-300',
  },
  upcoming: {
    card: 'default',
    badge: 'bg-amber-500/12 border-amber-400/30 text-amber-300',
    icon: 'text-amber-300',
  },
  risk: {
    card: 'crimson',
    badge: 'bg-crimson-500/12 border-crimson-400/30 text-crimson-300',
    icon: 'text-crimson-300',
  },
}

export function MomentCard({
  variant,
  label,
  title,
  description,
  icon: Icon,
  href,
  cta,
}: MomentCardProps) {
  const styles = VARIANT_STYLES[variant]
  const body = (
    <Card
      variant={styles.card}
      padding="md"
      interactive={!!href}
      className="h-full flex flex-col c360-hover-lift"
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-lg border',
            styles.badge
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', styles.icon)} />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
          {label}
        </p>
      </div>
      <h3
        className={cn(
          'text-lg font-bold leading-tight mb-1',
          variant === 'risk' ? 'text-crimson-200' : 'text-[color:var(--text-primary)]'
        )}
      >
        {title}
      </h3>
      <p className="text-sm text-[color:var(--text-secondary)] flex-1 leading-relaxed">
        {description}
      </p>
      {cta ? (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-300">
          {cta}
          <ArrowRight className="h-3 w-3" />
        </div>
      ) : null}
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-2xl">
        {body}
      </Link>
    )
  }
  return body
}
