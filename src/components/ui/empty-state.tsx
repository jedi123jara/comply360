/**
 * EmptyState — diseño consistente cuando una tabla, lista, o sección
 * no tiene contenido.
 *
 * Reglas de uso:
 *   1. Toda lista/tabla/sección con `length === 0` usa este componente.
 *   2. El título describe el estado ("Sin trabajadores todavía"), no la
 *      acción a tomar.
 *   3. La descripción explica por qué se ve así y qué se gana al actuar.
 *   4. Al menos UN `action` con CTA específico al estado
 *      (no "volver al dashboard").
 *
 * Variantes:
 *   - default: para dashboards (surface oscuro)
   *   - light:   para marketing / portal worker (surface de alto contraste)
 *   - compact: espacio vertical reducido (para inline en cards)
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  variant?: 'default' | 'light' | 'compact'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const isLight = variant === 'light'
  const isCompact = variant === 'compact'

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-6',
        className,
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
          isLight
            ? 'bg-[color:var(--bg-inset)] ring-1 ring-[color:var(--border-default)]'
            : 'bg-[color:var(--bg-inset)] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        )}
      >
        <Icon
          className={cn(
            'w-8 h-8',
            isLight ? 'text-[color:var(--text-tertiary)]' : 'text-text-secondary',
          )}
        />
      </div>
      <h3
        className={cn(
          'text-base font-semibold mb-1',
          isLight ? 'text-[color:var(--text-primary)]' : 'text-text-primary',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'text-sm max-w-xs',
            isLight ? 'text-[color:var(--text-tertiary)]' : 'text-gray-400',
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && <EmptyStateButton action={action} primary isLight={isLight} />}
          {secondaryAction && (
            <EmptyStateButton action={secondaryAction} primary={false} isLight={isLight} />
          )}
        </div>
      )}
    </div>
  )
}

function EmptyStateButton({
  action,
  primary,
  isLight,
}: {
  action: EmptyStateAction
  primary: boolean
  isLight: boolean
}) {
  const primaryClasses = isLight
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-primary hover:bg-primary/90 text-white'
  const secondaryClasses = isLight
    ? 'bg-[color:var(--bg-surface)] ring-1 ring-[color:var(--border-default)] hover:bg-[color:var(--bg-surface-hover)] text-[color:var(--text-secondary)]'
    : 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-text-primary'

  const className = cn(
    'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
    primary ? primaryClasses : secondaryClasses,
    isLight
      ? 'focus-visible:ring-offset-[color:var(--bg-canvas)]'
      : 'focus-visible:ring-offset-transparent',
  )

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  )
}
