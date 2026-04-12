/**
 * WCAG 2.1 AA Compliance Utilities for COMPLY360
 * ------------------------------------------------
 * Pure utility functions — no React dependencies.
 */

import type { RefObject } from 'react'

// ---------------------------------------------------------------------------
// Focus Management
// ---------------------------------------------------------------------------

/**
 * Move focus to the main content area (skip-to-content pattern).
 * Looks for an element with id="main-content" by default.
 */
export function skipToContent(targetId = 'main-content'): void {
  const el = document.getElementById(targetId)
  if (!el) return
  el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: false })
  // Clean up tabindex after blur so it doesn't remain in tab order
  el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })
}

// ---------------------------------------------------------------------------
// Live Region Announcer
// ---------------------------------------------------------------------------

let liveRegion: HTMLElement | null = null

function getOrCreateLiveRegion(): HTMLElement {
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion

  liveRegion = document.createElement('div')
  liveRegion.setAttribute('role', 'status')
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  Object.assign(liveRegion.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })
  document.body.appendChild(liveRegion)
  return liveRegion
}

/**
 * Announce a message to screen readers via an ARIA live region.
 * Clears after `clearAfterMs` (default 5 000 ms).
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
  clearAfterMs = 5000,
): void {
  const region = getOrCreateLiveRegion()
  region.setAttribute('aria-live', priority)
  // Clear then set to ensure AT re-reads
  region.textContent = ''
  requestAnimationFrame(() => {
    region.textContent = message
  })
  if (clearAfterMs > 0) {
    setTimeout(() => {
      region.textContent = ''
    }, clearAfterMs)
  }
}

// ---------------------------------------------------------------------------
// Focus Trap
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details',
  'summary',
].join(', ')

/**
 * Trap focus within a container element (for modals / dialogs).
 * Returns a cleanup function that removes the trap.
 */
export function trapFocus(containerRef: RefObject<HTMLElement | null>): () => void {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !containerRef.current) return

    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null) // visible only

    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}

// ---------------------------------------------------------------------------
// WCAG Contrast Utilities
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string to { r, g, b } (0-255).
 * Supports #RGB, #RRGGBB, RGB, RRGGBB.
 */
function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace(/^#/, '')
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  const num = parseInt(h, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Compute relative luminance per WCAG 2.1.
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex)
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate the contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = relativeLuminance(color1)
  const l2 = relativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if a foreground/background color pair meets WCAG 2.1 AA.
 *
 * - Normal text: contrast ratio >= 4.5:1
 * - Large text (>= 18pt or >= 14pt bold): contrast ratio >= 3:1
 */
export function isAACompliant(
  foreground: string,
  background: string,
  isLargeText = false,
): boolean {
  const ratio = getContrastRatio(foreground, background)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}
