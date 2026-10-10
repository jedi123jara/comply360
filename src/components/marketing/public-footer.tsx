import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FOOTER_GRUPOS, SITIO } from '@/lib/sitio/site'
import { PublicBrandLink } from './public-brand'
import { PUBLIC_AUTH_LINKS, PUBLIC_LEGAL_LINKS, pub } from './public-theme'

const linkClass = 'text-sm text-[#CBD5E1] transition-colors hover:text-[#F5B301]'
const headingClass = 'mb-1 text-sm font-bold text-[#ffffff]'

/** Footer público azul marino #081428 con el mapa del sitio del estudio. */
export function PublicFooter({ wide = false }: { wide?: boolean }) {
  const container = wide ? pub.containerWide : pub.container
  return (
    <footer className="bg-[#081428] text-[#CBD5E1]">
      <div className={cn(container, 'grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]')}>
        <div className="sm:col-span-2 lg:col-span-1">
          <PublicBrandLink />
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#CBD5E1]">
            Estudio de cumplimiento normativo solo para empresas: laboral, SST, hostigamiento sexual y capacitaciones
            obligatorias.
          </p>
          <p className="mt-3 text-sm leading-6 text-[#94A3B8]">
            {SITIO.ciudad}, {SITIO.region}. {SITIO.cobertura}.
          </p>
          <a href={`mailto:${SITIO.email}`} className={cn(linkClass, 'mt-2 inline-block')}>
            {SITIO.email}
          </a>
        </div>

        {FOOTER_GRUPOS.map((grupo) => (
          <nav key={grupo.titulo} aria-label={grupo.titulo} className="flex flex-col gap-2.5">
            <span className={headingClass}>{grupo.titulo}</span>
            {grupo.enlaces.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-[#ffffff]/10">
        <div
          className={cn(
            container,
            'flex flex-col gap-3 py-5 text-xs text-[#94A3B8] sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <span>© {new Date().getFullYear()} Comply360. Cumplimiento normativo para empresas en el Perú.</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            {PUBLIC_LEGAL_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-[#F5B301]">
                {item.label}
              </Link>
            ))}
            <Link href={PUBLIC_AUTH_LINKS.signIn.href} className="transition-colors hover:text-[#F5B301]" rel="nofollow">
              {PUBLIC_AUTH_LINKS.signIn.label}
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
