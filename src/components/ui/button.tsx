'use client'

import { forwardRef, useCallback, useEffect, useRef, type Ref, type RefObject } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Button v5 — texto ≥ 4,5:1 en tema claro (incluido hover).
 *
 * Variants:
 * - `primary` (default): emerald sólido (azul de marca en el dashboard claro), texto blanco
 * - `secondary`: outline, texto neutral, hover bg gris muy claro
 * - `ghost`: sin borde, hover background sutil
 * - `danger`: rojo sólido (rose-700 → rose-800 en hover). No usa la rampa
 *   crimson porque en el tema oscuro crimson-600/700 son tonos claros y el
 *   texto blanco quedaba en 2,7:1 → 1,4:1.
 * - `gold`: acento premium (plan PRO, certificaciones). Dorado de marca con
 *   tinta oscura (amber-950); con texto blanco no llegaba a 2,2:1.
 * - `emerald-soft`: tinte emerald /12 + tinta emerald-700, muy sutil
 * - `link`: underline, emerald
 *
 * Botones solo-ícono (`size="icon"` / `"icon-sm"` o sin texto): necesitan
 * `aria-label` (o `aria-labelledby` / `title`) para que el lector de pantalla
 * diga qué hacen. En desarrollo se avisa por consola una vez por botón si falta.
 *   <Button size="icon" aria-label="Cerrar"><X className="h-4 w-4" /></Button>
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-all duration-[var(--motion-micro)] ease-[var(--ease-standard)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-canvas)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[var(--scale-press)] active:transition-[transform] active:duration-[var(--motion-instant)]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-emerald-600 text-white',
          'shadow-[0_1px_2px_rgba(16,185,129,0.25),0_1px_0_rgba(255,255,255,0.12)_inset]',
          'hover:bg-emerald-700',
          'hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)]',
        ],
        secondary: [
          'bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]',
          'border border-[color:var(--border-default)]',
          'shadow-[var(--elevation-1)]',
          'hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-hover)]',
        ],
        ghost: [
          'text-[color:var(--text-secondary)]',
          'hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)]',
        ],
        danger: [
          'bg-rose-700 text-white',
          'shadow-[0_1px_2px_rgba(239,68,68,0.25)]',
          'hover:bg-rose-800 hover:shadow-[0_4px_12px_rgba(239,68,68,0.25)]',
        ],
        gold: [
          'bg-gold-500 text-amber-950',
          'shadow-[0_1px_2px_rgba(212,168,83,0.25)]',
          'hover:bg-gold-400 hover:shadow-[0_4px_12px_rgba(212,168,83,0.30)]',
        ],
        'emerald-soft': [
          'bg-emerald-500/12 text-emerald-700 border border-emerald-500/30',
          'hover:bg-emerald-500/18 hover:border-emerald-500/50',
        ],
        link: [
          'text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline',
          'p-0 h-auto',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
        sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
        xl: 'h-14 px-8 text-base rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
    compoundVariants: [
      { variant: 'link', className: '!h-auto !p-0' },
    ],
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  asChild?: boolean
}

// ─── Aviso de desarrollo: botón sin nombre accesible ─────────────────────

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as RefObject<T | null>).current = value
}

/** Texto que llega al lector de pantalla (ignora lo que está bajo aria-hidden). */
function hasReadableText(el: Element): boolean {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    const hidden = node.parentElement?.closest('[aria-hidden="true"]')
    if (!hidden || !el.contains(hidden)) return true
  }
  return false
}

function hasAccessibleName(el: Element): boolean {
  if (el.getAttribute('aria-label')?.trim()) return true
  if (el.getAttribute('aria-labelledby')?.trim()) return true
  if (el.getAttribute('title')?.trim()) return true
  if (hasReadableText(el)) return true
  // Un ícono o imagen con nombre propio también nombra al botón.
  return el.querySelector('[aria-label]:not([aria-label=""]), img[alt]:not([alt=""])') !== null
}

/** Avisa (solo fuera de producción y una vez por botón) si el botón no tiene nombre. */
function useAccessibleNameWarning(elementRef: RefObject<HTMLElement | null>) {
  const warnedRef = useRef(false)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || warnedRef.current) return
    const el = elementRef.current
    if (!el || hasAccessibleName(el)) return
    warnedRef.current = true
    console.warn(
      '[Button] Botón solo-ícono sin nombre accesible. Agrega `aria-label` (o `aria-labelledby` / `title`) ' +
        'para que los lectores de pantalla digan qué hace.',
      el
    )
  })
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      icon,
      iconRight,
      children,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    const elementRef = useRef<HTMLButtonElement | null>(null)
    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        elementRef.current = node
        assignRef(ref, node)
      },
      [ref]
    )
    useAccessibleNameWarning(elementRef)

    const decorated = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children}
        {!loading && iconRight ? (
          <span className="shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
      </>
    )

    return (
      <Comp
        ref={setRefs as never}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {asChild ? children : decorated}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { buttonVariants }
