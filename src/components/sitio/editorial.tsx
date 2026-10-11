import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PUBLIC_HERO_BACKGROUND, pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from './breadcrumbs'

type Tono = 'blanco' | 'claro' | 'oscuro'

const FONDO: Record<Tono, string> = {
  blanco: 'bg-[#ffffff]',
  claro: 'bg-[#F5F7FB]',
  oscuro: 'bg-[#0B1B36] text-[#ffffff]',
}

/** Etiqueta de sección con índice: «01 — Qué hacemos». */
export function EtiquetaSeccion({
  numero,
  children,
  oscuro = false,
  className,
}: {
  numero?: string
  children: ReactNode
  oscuro?: boolean
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.18em]',
        oscuro ? 'text-[#94A3B8]' : 'text-[#5A6A80]',
        className,
      )}
    >
      {numero ? <span className={cn('tabular-nums', oscuro ? 'text-[#F5B301]' : 'text-[#B45309]')}>{numero}</span> : null}
      <span aria-hidden className={cn('h-px w-8', oscuro ? 'bg-[#ffffff]/20' : 'bg-[#C9D1DD]')} />
      {children}
    </p>
  )
}

/**
 * Encabezado de las páginas interiores: migas, etiqueta, h1 y bajada sobre azul
 * marino. `aside` muestra una ficha a la derecha (precio, base legal, plazos).
 */
export function HeroPagina({
  migas,
  etiqueta,
  titulo,
  bajada,
  children,
  aside,
}: {
  migas: Array<{ nombre: string; ruta: string }>
  etiqueta: string
  titulo: ReactNode
  bajada?: ReactNode
  children?: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden text-[#ffffff]" style={{ background: PUBLIC_HERO_BACKGROUND }}>
      <div className={cn(pub.container, 'pb-20 pt-8 sm:pb-24 sm:pt-10')}>
        <Breadcrumbs items={migas} className="mb-14" />
        <div className={cn(aside && 'grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-x-10')}>
          <div className={cn(aside && 'lg:col-span-7')}>
            <EtiquetaSeccion oscuro className="mb-6">
              {etiqueta}
            </EtiquetaSeccion>
            <h1 className="max-w-[22ch] text-balance text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-[#ffffff] sm:text-[3.4rem]">
              {titulo}
            </h1>
            {bajada ? <p className="mt-6 max-w-2xl text-lg leading-8 text-[#CBD5E1]">{bajada}</p> : null}
            {children}
          </div>
          {aside ? <div className="lg:col-span-5">{aside}</div> : null}
        </div>
      </div>
    </section>
  )
}

/** Ficha de datos clave para el `aside` del encabezado. */
export function FichaHero({ filas }: { filas: Array<{ etiqueta: string; valor: ReactNode }> }) {
  return (
    <dl className="rounded-2xl border border-[#ffffff]/12 bg-[#ffffff]/[0.04] px-6 py-2">
      {filas.map((f) => (
        <div key={f.etiqueta} className="grid gap-1 border-b border-[#ffffff]/10 py-4 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-[#7C8BA3]">{f.etiqueta}</dt>
          <dd className="text-sm font-semibold text-[#ffffff]">{f.valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Título de sección del sistema editorial (mismo tamaño en todo el sitio). */
export const tituloSeccion =
  'max-w-3xl text-balance text-[2rem] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[2.75rem]'

/**
 * Sección editorial: índice a la izquierda (3 de 12 columnas) y contenido a la
 * derecha (9 de 12). Es la estructura común de las páginas del sitio.
 */
export function Seccion({
  id,
  numero,
  etiqueta,
  titulo,
  bajada,
  tono = 'blanco',
  children,
  className,
}: {
  id?: string
  numero?: string
  etiqueta: string
  titulo?: ReactNode
  bajada?: ReactNode
  tono?: Tono
  children?: ReactNode
  className?: string
}) {
  const oscuro = tono === 'oscuro'
  const tituloId = id ? `${id}-titulo` : undefined
  return (
    <section
      id={id}
      aria-labelledby={titulo ? tituloId : undefined}
      aria-label={titulo ? undefined : etiqueta}
      className={cn(FONDO[tono], !oscuro && 'border-t border-[#E1E7F0]', 'scroll-mt-20', className)}
    >
      <div className={cn(pub.container, 'grid gap-y-8 py-20 sm:py-28 lg:grid-cols-12 lg:gap-x-10')}>
        <div className="lg:col-span-3">
          <EtiquetaSeccion numero={numero} oscuro={oscuro} className="lg:sticky lg:top-28 lg:pt-3">
            {etiqueta}
          </EtiquetaSeccion>
        </div>
        <div className="min-w-0 lg:col-span-9">
          {titulo ? (
            <h2 id={tituloId} className={cn(tituloSeccion, oscuro ? 'text-[#ffffff]' : 'text-[#0B1B36]')}>
              {titulo}
            </h2>
          ) : null}
          {bajada ? (
            <p className={cn('mt-5 max-w-2xl text-lg leading-8', oscuro ? 'text-[#CBD5E1]' : 'text-[#475569]')}>{bajada}</p>
          ) : null}
          {children ? <div className={titulo || bajada ? 'mt-12' : undefined}>{children}</div> : null}
        </div>
      </div>
    </section>
  )
}
