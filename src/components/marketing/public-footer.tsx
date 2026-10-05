import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PublicBrandLink } from './public-brand'
import { PUBLIC_AUTH_LINKS, PUBLIC_LEGAL_LINKS, PUBLIC_NAV, pub } from './public-theme'

const linkClass = 'text-sm text-[#CBD5E1] transition-colors hover:text-[#F5B301]'
const headingClass = 'mb-1 text-sm font-bold text-[#ffffff]'

/** Footer público azul marino #081428. */
export function PublicFooter({ wide = false }: { wide?: boolean }) {
  return (
    <footer className="bg-[#081428] text-[#CBD5E1]">
      <div
        className={cn(
          wide ? pub.containerWide : pub.container,
          'grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]',
        )}
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <PublicBrandLink />
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#CBD5E1]">
            Compliance laboral peruano para equipos que necesitan evidencia, control y velocidad.
          </p>
        </div>

        <nav aria-label="Producto" className="flex flex-col gap-2.5">
          <span className={headingClass}>Producto</span>
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Cuenta" className="flex flex-col gap-2.5">
          <span className={headingClass}>Cuenta</span>
          <Link href={PUBLIC_AUTH_LINKS.signIn.href} className={linkClass}>
            {PUBLIC_AUTH_LINKS.signIn.label}
          </Link>
          <Link href={PUBLIC_AUTH_LINKS.signUp.href} className={linkClass}>
            {PUBLIC_AUTH_LINKS.signUp.label}
          </Link>
        </nav>

        <nav aria-label="Legal" className="flex flex-col gap-2.5">
          <span className={headingClass}>Legal</span>
          {PUBLIC_LEGAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-[#ffffff]/10">
        <div className={cn(wide ? pub.containerWide : pub.container, 'py-5 text-xs text-[#94A3B8]')}>
          © {new Date().getFullYear()} Comply360. Compliance laboral peruano.
        </div>
      </div>
    </footer>
  )
}
