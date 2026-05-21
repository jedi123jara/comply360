import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function PlanesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="c360-marketing-light min-h-screen bg-[#f6fbfb] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1480px] items-center justify-between gap-5 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight text-slate-950">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-teal-400 to-blue-600 text-white shadow-[0_14px_34px_rgba(20,184,166,0.22)]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>
              Comply<span className="text-teal-600">360</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/#producto" className="transition hover:text-slate-950">
              Producto
            </Link>
            <Link href="/#riesgo" className="transition hover:text-slate-950">
              Riesgo
            </Link>
            <Link href="/#sectores" className="transition hover:text-slate-950">
              Sectores
            </Link>
            <Link href="/planes" className="text-slate-950">
              Precios
            </Link>
            <Link href="/#faq" className="transition hover:text-slate-950">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 px-4 text-sm font-bold text-white shadow-[0_16px_44px_rgba(20,184,166,0.2)] transition hover:-translate-y-0.5"
            >
              Regístrate gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <footer className="mt-16 border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>© {new Date().getFullYear()} Comply360, compliance laboral peruano</div>
          <div className="flex gap-4">
            <Link href="/terminos" className="transition hover:text-slate-950">
              Términos
            </Link>
            <Link href="/privacidad" className="transition hover:text-slate-950">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
