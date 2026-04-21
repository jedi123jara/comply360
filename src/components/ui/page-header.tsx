import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

/**
 * PageHeader — cabecera estándar para páginas del dashboard.
 *
 * Aplica el mismo tratamiento visual en cada hub: card blanca con accent
 * bar superior (emerald / amber / crimson / none), eyebrow pill opcional,
 * H1 + descripción, y slot para acciones.
 *
 * Uso:
 *   <PageHeader
 *     icon={Users}
 *     eyebrow="Equipo"
 *     title="Trabajadores"
 *     description="Gestioná tu planilla, legajo digital y alertas por trabajador."
 *     accent="emerald"
 *     actions={<Button>Nuevo trabajador</Button>}
 *   />
 */

export interface PageHeaderProps {
  icon?: LucideIcon
  eyebrow?: string
  title: string
  description?: string
  accent?: 'emerald' | 'amber' | 'crimson' | 'none'
  actions?: React.ReactNode
  className?: string
}

const ACCENT_STYLES: Record<string, string> = {
  emerald:
    'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-2xl before:bg-[image:var(--accent-bar-emerald)]',
  amber:
    'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-2xl before:bg-[image:var(--accent-bar-amber)]',
  crimson:
    'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-2xl before:bg-[image:var(--accent-bar-crimson)]',
  none: '',
}

const ICON_STYLES: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  amber: 'bg-amber-50 border-amber-200 text-amber-600',
  crimson: 'bg-crimson-50 border-crimson-200 text-crimson-600',
  none: 'bg-[color:var(--neutral-100)] border-[color:var(--border-default)] text-[color:var(--text-secondary)]',
}

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent = 'emerald',
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'relative rounded-2xl border border-[color:var(--border-default)] bg-white shadow-[var(--elevation-3)] overflow-hidden',
        'motion-fade-in-up',
        ACCENT_STYLES[accent],
        className
      )}
    >
      <div className="px-6 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {Icon ? (
            <span
              className={cn(
                'shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border',
                ICON_STYLES[accent]
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <Badge
                variant={
                  accent === 'amber'
                    ? 'warning'
                    : accent === 'crimson'
                      ? 'danger'
                      : 'emerald'
                }
                size="sm"
                dot
                className="mb-2"
              >
                {eyebrow}
              </Badge>
            ) : null}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--text-primary)] leading-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 text-sm sm:text-base text-[color:var(--text-secondary)] max-w-2xl leading-relaxed">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}
