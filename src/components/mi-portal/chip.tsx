/**
 * Chip — pill de estado con variantes semánticas.
 *
 * Uso:
 *  <Chip variant="success">Firmado</Chip>
 *  <Chip variant="warning" icon={<Clock />}>Pendiente</Chip>
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ChipVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

interface ChipProps {
  variant?: ChipVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  brand: 'bg-emerald-600 text-white border-emerald-600',
}

export function Chip({ variant = 'neutral', size = 'sm', icon, children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
