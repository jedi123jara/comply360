'use client'

import { forwardRef } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

/**
 * Tooltip — Radix + Obsidian skin.
 *
 * Wrap your app (or a subtree) in `<TooltipProvider>` once, then use:
 *
 *   <Tooltip content="Calcular CTS">
 *     <Button size="icon"><Calculator /></Button>
 *   </Tooltip>
 */
export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[var(--z-tooltip)] overflow-hidden rounded-md px-2.5 py-1.5',
        'text-xs font-medium text-white',
        'bg-[color:var(--neutral-900)]',
        'shadow-[var(--elevation-3)]',
        'data-[state=delayed-open]:motion-fade-in',
        'data-[side=top]:origin-bottom data-[side=bottom]:origin-top',
        'data-[side=left]:origin-right data-[side=right]:origin-left',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = 'TooltipContent'

/**
 * Simple tooltip shorthand — the 90% case.
 */
export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  disabled?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 200,
  disabled,
}: TooltipProps) {
  if (disabled) return <>{children}</>
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  )
}
