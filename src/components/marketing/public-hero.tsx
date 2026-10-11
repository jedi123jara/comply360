import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PUBLIC_HERO_BACKGROUND, pub } from './public-theme'

/**
 * Hero azul marino a todo el ancho (cabecera de cada página pública).
 * El título va en sans gruesa blanca; la palabra destacada se marca desde fuera
 * con `<span className={pub.highlightOnNavy}>`.
 */
export function PublicHero({
  eyebrow,
  title,
  description,
  children,
  media,
  align = 'center',
  titleAs = 'h1',
  wide = false,
  className,
  contentClassName,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Acciones u otro contenido debajo de la descripción. */
  children?: ReactNode
  /** Elemento sobre el eyebrow (p. ej. ícono de la calculadora). */
  media?: ReactNode
  align?: 'center' | 'left'
  /** `p` cuando la página ya tiene su propio h1 (p. ej. la tarjeta de Clerk). */
  titleAs?: 'h1' | 'h2' | 'p'
  wide?: boolean
  className?: string
  contentClassName?: string
}) {
  const Title = titleAs
  const centered = align === 'center'
  return (
    <section className={cn(pub.hero, className)} style={{ background: PUBLIC_HERO_BACKGROUND }}>
      <div aria-hidden className={pub.heroGrid} />
      <div
        className={cn(
          wide ? pub.containerWide : pub.container,
          'relative py-12 sm:py-16',
          centered && 'text-center',
          contentClassName,
        )}
      >
        {media ? <div className={cn('mb-5 flex', centered && 'justify-center')}>{media}</div> : null}
        {eyebrow ? <div className={cn(pub.eyebrowOnNavy, 'mb-5')}>{eyebrow}</div> : null}
        <Title className={cn(pub.h1OnNavy, centered ? 'mx-auto max-w-3xl' : 'max-w-3xl')}>{title}</Title>
        {description ? (
          <p className={cn(pub.leadOnNavy, 'mt-4 max-w-2xl', centered && 'mx-auto')}>{description}</p>
        ) : null}
        {children}
      </div>
    </section>
  )
}
