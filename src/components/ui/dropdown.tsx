'use client'

import { forwardRef } from 'react'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * DropdownMenu — Radix + Obsidian skin.
 * Use for context menus, user menu, row actions, etc.
 */
export const DropdownMenu = DropdownPrimitive.Root
export const DropdownMenuTrigger = DropdownPrimitive.Trigger
export const DropdownMenuGroup = DropdownPrimitive.Group
export const DropdownMenuPortal = DropdownPrimitive.Portal
export const DropdownMenuSub = DropdownPrimitive.Sub
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[var(--z-popover)] min-w-[220px] overflow-hidden rounded-xl p-1',
        'bg-[color:var(--bg-elevated)]',
        'border border-[color:var(--border-strong)]',
        'shadow-[var(--elevation-3)]',
        'data-[state=open]:motion-scale-in',
        'data-[side=top]:origin-bottom data-[side=bottom]:origin-top',
        className
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const itemClasses = cn(
  'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5',
  'text-sm text-[color:var(--text-secondary)]',
  'outline-none select-none',
  'cursor-default',
  'transition-colors duration-100',
  'data-[highlighted]:bg-[color:var(--bg-surface-hover)] data-[highlighted]:text-[color:var(--text-primary)]',
  'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none'
)

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & {
    inset?: boolean
    destructive?: boolean
  }
>(({ className, inset, destructive, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      itemClasses,
      inset && 'pl-8',
      destructive &&
        'text-crimson-300 data-[highlighted]:bg-crimson-500/12 data-[highlighted]:text-crimson-200',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

export const DropdownMenuCheckboxItem = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownPrimitive.CheckboxItem
    ref={ref}
    className={cn(itemClasses, 'pl-8', className)}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      </DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

export const DropdownMenuRadioItem = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownPrimitive.RadioItem
    ref={ref}
    className={cn(itemClasses, 'pl-8', className)}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-emerald-600 text-emerald-600" />
      </DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={cn(
      'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-[color:var(--border-subtle)]', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'ml-auto text-[11px] tracking-widest text-[color:var(--text-tertiary)]',
      className
    )}
    {...props}
  />
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export const DropdownMenuSubTrigger = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownPrimitive.SubTrigger
    ref={ref}
    className={cn(itemClasses, inset && 'pl-8', className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-3.5 w-3.5" />
  </DropdownPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

export const DropdownMenuSubContent = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-[var(--z-popover)] min-w-[200px] overflow-hidden rounded-xl p-1',
        'bg-[color:var(--bg-elevated)]',
      'border border-[color:var(--border-strong)]',
      'shadow-[var(--elevation-3)]',
      'data-[state=open]:motion-scale-in',
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent'
