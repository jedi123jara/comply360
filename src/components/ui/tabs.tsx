'use client'

import { forwardRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Tabs — Radix + Obsidian skin.
 *
 * Drop-in compatible with the previous context-based API:
 *   <Tabs defaultValue="a">
 *     <TabsList><TabsTrigger value="a">…</TabsTrigger></TabsList>
 *     <TabsContent value="a">…</TabsContent>
 *   </Tabs>
 *
 * Variants:
 * - `pills` (default): rounded pills in a glass tray
 * - `underline`: classic underline bar
 * - `segmented`: filled pill container (iOS-like)
 */

const listVariants = cva('inline-flex items-center', {
  variants: {
    variant: {
      pills: 'gap-1 p-1 bg-[color:var(--bg-inset)] border border-[color:var(--border-subtle)] rounded-lg',
      underline: 'gap-6 border-b border-[color:var(--border-subtle)] -mb-px w-full',
      segmented:
        'gap-0.5 p-0.5 bg-[color:var(--bg-inset)] border border-[color:var(--border-subtle)] rounded-md',
    },
    fullWidth: { true: 'w-full' },
  },
  defaultVariants: { variant: 'pills' },
})

const triggerVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2',
    'text-sm font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
    'disabled:opacity-50 disabled:pointer-events-none',
  ],
  {
    variants: {
      variant: {
        pills: [
          'px-3.5 py-1.5 rounded-lg',
          'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
          'data-[state=active]:bg-[color:var(--bg-surface)] data-[state=active]:text-emerald-200',
          'data-[state=active]:shadow-[var(--elevation-1)]',
        ],
        underline: [
          'px-0 py-3',
          'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
          'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5',
          'after:bg-emerald-600 after:scale-x-0 after:transition-transform after:duration-200',
          'data-[state=active]:text-[color:var(--text-primary)] data-[state=active]:after:scale-x-100',
        ],
        segmented: [
          'px-3 py-1 rounded-md text-xs',
          'text-[color:var(--text-secondary)]',
          'data-[state=active]:bg-[color:var(--bg-surface)] data-[state=active]:text-[color:var(--text-primary)]',
          'data-[state=active]:shadow-[var(--elevation-1)]',
        ],
      },
    },
    defaultVariants: { variant: 'pills' },
  }
)

export const Tabs = TabsPrimitive.Root

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof listVariants> {}

export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, fullWidth, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(listVariants({ variant, fullWidth }), className)}
    {...props}
  />
))
TabsList.displayName = 'TabsList'

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof triggerVariants> {}

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(triggerVariants({ variant }), className)}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none',
      'data-[state=active]:motion-fade-in',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'
