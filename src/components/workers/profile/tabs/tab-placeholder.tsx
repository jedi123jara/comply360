'use client'

import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Placeholder tab — used for tabs whose full implementation is scoped to
 * Fase D or later sprints. Keeps the UX coherent while routes are wired.
 */
export function TabPlaceholder({
  icon: Icon,
  title,
  description,
  href,
  cta = 'Abrir módulo',
}: {
  icon: LucideIcon
  title: string
  description: string
  href?: string
  cta?: string
}) {
  return (
    <Card padding="lg" className="text-center">
      <div className="flex flex-col items-center gap-3 py-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
          <Icon className="h-5 w-5 text-emerald-600" />
        </span>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-sm text-[color:var(--text-secondary)] max-w-md">{description}</p>
        {href ? (
          <Button asChild variant="secondary" className="mt-2">
            <a href={href}>{cta}</a>
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
