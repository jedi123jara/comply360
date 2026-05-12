'use client'

import { forwardRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Select v4 — Radix-powered, dark skin.
 *
 * Reemplaza el `<select>` nativo para garantizar apariencia consistente
 * en Windows/macOS con dark mode del OS (el `<option>` nativo ignora
 * nuestro CSS y se ve con fondo oscuro en esos casos). Totalmente
 * accesible vía teclado; portaled al body con backdrop.
 *
 * Uso mínimo:
 *   <Select value={sector} onValueChange={setSector}>
 *     <SelectTrigger error={!!errors.sector}>
 *       <SelectValue placeholder="Selecciona sector…" />
 *     </SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="COMERCIO">Comercio</SelectItem>
 *     </SelectContent>
 *   </Select>
 */

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean
  }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2',
      'text-sm text-[color:var(--text-primary)]',
      'bg-[color:var(--bg-surface)] border transition-all',
      'focus:outline-none focus:shadow-[0_0_0_4px_rgba(16,185,129,0.10)]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[placeholder]:text-[color:var(--text-tertiary)]',
      '[&>span]:line-clamp-1 [&>span]:text-left',
      error
        ? 'border-crimson-300 focus:border-crimson-500'
        : 'border-[color:var(--border-default)] focus:border-emerald-500',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectScrollUpButton = forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-[color:var(--text-tertiary)]',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

export const SelectScrollDownButton = forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-[color:var(--text-tertiary)]',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-[var(--z-popover)] max-h-[320px] min-w-[8rem] overflow-hidden rounded-lg',
        'bg-[color:var(--bg-elevated)] border border-[color:var(--border-default)]',
        'shadow-[var(--elevation-3)]',
        'data-[state=open]:motion-scale-in',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectLabel = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]',
      className
    )}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center gap-2 rounded-md',
      'py-2 pl-8 pr-2 text-sm outline-none',
      'text-[color:var(--text-primary)]',
      'data-[highlighted]:bg-emerald-500/12 data-[highlighted]:text-emerald-200',
      'data-[state=checked]:bg-emerald-500/12 data-[state=checked]:text-emerald-200 data-[state=checked]:font-medium',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

export const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[color:var(--border-subtle)]', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName
