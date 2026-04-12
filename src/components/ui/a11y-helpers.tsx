'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { skipToContent, trapFocus } from '@/lib/accessibility'

// ---------------------------------------------------------------------------
// SkipToContent
// ---------------------------------------------------------------------------

/**
 * Visually hidden link that becomes visible on focus.
 * Allows keyboard users to skip directly to main content.
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'Saltar al contenido principal',
}: {
  targetId?: string
  label?: string
}) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        e.preventDefault()
        skipToContent(targetId)
      }}
      className="fixed left-2 top-2 z-[9999] -translate-y-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      {label}
    </a>
  )
}

// ---------------------------------------------------------------------------
// LiveRegion
// ---------------------------------------------------------------------------

/**
 * Renders an ARIA live region that announces its children to screen readers.
 * Content changes are announced automatically by assistive technology.
 */
export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
  className,
}: {
  children: ReactNode
  priority?: 'polite' | 'assertive'
  atomic?: boolean
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className={className ?? 'sr-only'}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VisuallyHidden
// ---------------------------------------------------------------------------

/**
 * Wrapper that hides content visually but keeps it accessible to screen readers.
 * Uses the standard sr-only technique.
 */
export function VisuallyHidden({
  children,
  as: Tag = 'span',
}: {
  children: ReactNode
  as?: 'span' | 'div' | 'label' | 'p'
}) {
  return (
    <Tag
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        margin: '-1px',
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Tag>
  )
}

// ---------------------------------------------------------------------------
// FocusTrap
// ---------------------------------------------------------------------------

/**
 * Traps keyboard focus within its children.
 * Useful for modals, dialogs, and drawers.
 *
 * - On mount: focuses the first focusable element (or the container).
 * - On Tab/Shift+Tab: wraps focus within the container.
 * - On unmount: restores focus to the previously focused element.
 */
export function FocusTrap({
  children,
  active = true,
  className,
  restoreFocus = true,
}: {
  children: ReactNode
  active?: boolean
  className?: string
  restoreFocus?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Save previously focused element
  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
    }
  }, [active])

  // Set up the trap
  useEffect(() => {
    if (!active || !containerRef.current) return

    // Focus first focusable or container
    const focusable = containerRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable) {
      focusable.focus()
    } else {
      containerRef.current.setAttribute('tabindex', '-1')
      containerRef.current.focus()
    }

    const cleanup = trapFocus(containerRef)

    return () => {
      cleanup()
      // Restore focus
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [active, restoreFocus])

  if (!active) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}
