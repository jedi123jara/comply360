'use client'

import { forwardRef } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor
export const PopoverClose = PopoverPrimitive.Close

export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 8, align = 'center', ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        'z-[var(--z-popover)] w-72 rounded-xl p-3',
        'bg-[color:var(--bg-elevated)]',
        'border border-[color:var(--border-default)]',
        'shadow-[var(--elevation-3)]',
        'outline-none',
        'data-[state=open]:motion-scale-in',
        'data-[side=top]:origin-bottom data-[side=bottom]:origin-top',
        'data-[side=left]:origin-right data-[side=right]:origin-left',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'
