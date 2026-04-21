'use client'

import Link from 'next/link'
import { Clock, AlertTriangle, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * UpcomingDeadlines — next 5 vencimientos priorizados.
 */

export interface DeadlineItem {
  id: string
  label: string
  dueIn: number // days until due — negative = overdue
  category: 'contract' | 'cts' | 'grat' | 'sst' | 'afp' | 'document' | 'other'
  amount?: number
  href?: string
}

const CATEGORY_META: Record<
  DeadlineItem['category'],
  { label: string; severity: 'critical' | 'high' | 'medium' | 'low' }
> = {
  contract: { label: 'Contrato', severity: 'high' },
  cts: { label: 'CTS', severity: 'high' },
  grat: { label: 'Gratificación', severity: 'high' },
  sst: { label: 'SST', severity: 'critical' },
  afp: { label: 'AFP', severity: 'medium' },
  document: { label: 'Documento', severity: 'low' },
  other: { label: 'Otro', severity: 'low' },
}

function dueLabel(dueIn: number): { text: string; severity: 'critical' | 'high' | 'medium' | 'low' } {
  if (dueIn < 0) return { text: `Vencido hace ${Math.abs(dueIn)}d`, severity: 'critical' }
  if (dueIn === 0) return { text: 'Hoy', severity: 'critical' }
  if (dueIn <= 3) return { text: `En ${dueIn}d`, severity: 'high' }
  if (dueIn <= 7) return { text: `En ${dueIn}d`, severity: 'medium' }
  return { text: `En ${dueIn}d`, severity: 'low' }
}

const pen = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
})

export function UpcomingDeadlines({ items }: { items: DeadlineItem[] }) {
  if (items.length === 0) {
    return (
      <Card padding="lg" className="motion-fade-in-up">
        <div className="flex flex-col items-center justify-center py-4 text-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-semibold">Ningún vencimiento crítico</p>
          <p className="text-xs text-[color:var(--text-tertiary)] max-w-xs">
            Los próximos 30 días están despejados. El Cockpit avisará en cuanto algo se ponga en riesgo.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none" className="motion-fade-in-up">
      <CardHeader>
        <div>
          <CardTitle>Próximos vencimientos</CardTitle>
          <CardDescription>Top 5 priorizados por riesgo y plazo.</CardDescription>
        </div>
        <Link
          href="/dashboard/calendario"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          Calendario <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="!p-0">
        <ul className="divide-y divide-[color:var(--border-subtle)]">
          {items.slice(0, 5).map((item) => {
            const meta = CATEGORY_META[item.category]
            const due = dueLabel(item.dueIn)
            return (
              <li key={item.id}>
                <Link
                  href={item.href ?? '/dashboard/calendario'}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3.5 transition-colors',
                    'hover:bg-[color:var(--neutral-50)] focus-visible:outline-none focus-visible:bg-[color:var(--neutral-50)]'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-lg border shrink-0',
                      due.severity === 'critical'
                        ? 'bg-crimson-50 border-crimson-200 text-crimson-600'
                        : due.severity === 'high'
                          ? 'bg-amber-50 border-amber-200 text-amber-600'
                          : due.severity === 'medium'
                            ? 'bg-amber-50/70 border-amber-100 text-amber-600'
                            : 'bg-cyan-50 border-cyan-100 text-cyan-600'
                    )}
                  >
                    {item.dueIn < 0 ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{item.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={meta.severity} size="xs">
                        {meta.label}
                      </Badge>
                      <span className="text-[11px] text-[color:var(--text-tertiary)]">{due.text}</span>
                      {item.amount ? (
                        <span className="text-[11px] font-mono text-[color:var(--text-secondary)]">
                          {pen.format(item.amount)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Calendar className="h-3.5 w-3.5 text-[color:var(--text-tertiary)] shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
