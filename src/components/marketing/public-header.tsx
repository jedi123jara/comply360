'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PublicBrandLink } from './public-brand'
import { PUBLIC_NAV, PUBLIC_PRIMARY_CTA, pub } from './public-theme'

export type PublicHeaderAction = { href: string; label: string }

/**
 * Header público: barra azul marino #0B1B36, logo, navegación del estudio y CTA
 * ámbar «Diagnóstico gratis →».
 *
 * - `full`: navegación completa + Contacto + CTA (menú en celular).
 * - `minimal`: solo logo y, opcionalmente, una acción (inicio de sesión,
 *   onboarding y preguntas del diagnóstico).
 */
export function PublicHeader({
  variant = 'full',
  action,
  wide = false,
}: {
  variant?: 'full' | 'minimal'
  action?: PublicHeaderAction
  wide?: boolean
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const container = wide ? pub.containerWide : pub.container

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 border-b border-[#ffffff]/10 bg-[#0B1B36]/95 backdrop-blur-xl">
      <div className={cn(container, 'flex min-h-16 items-center justify-between gap-3 sm:min-h-[72px] sm:gap-6')}>
        <PublicBrandLink />

        {variant === 'full' ? (
          <>
            <nav aria-label="Principal" className="hidden items-center gap-6 xl:flex">
              {PUBLIC_NAV.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'py-1 text-[0.92rem] font-semibold transition-colors',
                      active
                        ? 'text-[#ffffff] shadow-[inset_0_-2px_0_#F5B301]'
                        : 'text-[#CBD5E1] hover:text-[#ffffff]',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/contacto"
                aria-current={isActive('/contacto') ? 'page' : undefined}
                className="hidden px-2 py-2 text-[0.92rem] font-semibold text-[#CBD5E1] transition-colors hover:text-[#ffffff] md:inline-flex"
              >
                Contacto
              </Link>
              <Link href={PUBLIC_PRIMARY_CTA.href} className={cn(pub.btnPrimary, 'min-h-10 whitespace-nowrap px-4')}>
                {PUBLIC_PRIMARY_CTA.label}
                <ArrowRight aria-hidden className="hidden h-4 w-4 sm:block" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="public-mobile-menu"
                aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#ffffff]/25 text-[#ffffff] transition-colors hover:border-[#F5B301] xl:hidden"
              >
                {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
              </button>
            </div>
          </>
        ) : action ? (
          <Link href={action.href} className={cn(pub.btnSecondaryOnNavy, 'min-h-10 px-4')}>
            {action.label}
          </Link>
        ) : null}
      </div>

      {variant === 'full' && open ? (
        <nav id="public-mobile-menu" aria-label="Menú móvil" className="border-t border-[#ffffff]/10 bg-[#0B1B36] xl:hidden">
          <div className={cn(container, 'flex flex-col gap-1 py-3')}>
            {[...PUBLIC_NAV, { label: 'Contacto', href: '/contacto' }].map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-3 text-base font-semibold transition-colors',
                    active
                      ? 'bg-[#ffffff]/[0.06] text-[#ffffff] shadow-[inset_3px_0_0_#F5B301]'
                      : 'text-[#CBD5E1] hover:bg-[#ffffff]/[0.05] hover:text-[#ffffff]',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
