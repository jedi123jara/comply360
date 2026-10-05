import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PublicFooter } from './public-footer'
import { PublicHeader, type PublicHeaderAction } from './public-header'
import { PUBLIC_SHELL_STYLE } from './public-theme'

/**
 * Contenedor de toda página pública fuera de la landing: fondo azul marino de la
 * landing, tokens del tema público, header y footer compartidos.
 *
 * Sirve tanto en Server Components (layouts) como en Client Components
 * (diagnóstico, onboarding): no recibe funciones como props.
 */
export function PublicShell({
  children,
  header = 'full',
  headerAction,
  footer = true,
  wide = false,
  className,
  mainClassName,
}: {
  children: ReactNode
  header?: 'full' | 'minimal' | 'none'
  headerAction?: PublicHeaderAction
  footer?: boolean
  wide?: boolean
  className?: string
  mainClassName?: string
}) {
  return (
    <div
      className={cn('relative flex min-h-screen flex-col overflow-x-clip antialiased', className)}
      style={PUBLIC_SHELL_STYLE}
    >
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-lg bg-[#1f5eff] px-4 py-2 text-sm font-bold text-[#ffffff] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      {header !== 'none' ? <PublicHeader variant={header} action={headerAction} wide={wide} /> : null}
      <main id="contenido" className={cn('flex-1', mainClassName)}>
        {children}
      </main>
      {footer ? <PublicFooter wide={wide} /> : null}
    </div>
  )
}
