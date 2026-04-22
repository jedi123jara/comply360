import Link from 'next/link'
import type { ReactNode } from 'react'

export default function PlanesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 font-semibold tracking-tight"
          >
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              C
            </span>
            <span>
              COMPLY<span className="text-emerald-600">360</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4 text-sm">
            <Link
              href="/calculadoras"
              className="text-slate-600 hover:text-slate-900 px-2 py-1 hidden sm:block"
            >
              Calculadoras
            </Link>
            <Link
              href="/diagnostico-gratis"
              className="text-slate-600 hover:text-slate-900 px-2 py-1 hidden sm:block"
            >
              Diagnóstico
            </Link>
            <Link href="/planes" className="text-slate-900 font-medium px-2 py-1">
              Planes
            </Link>
            <Link
              href="/sign-in"
              className="text-slate-600 hover:text-slate-900 px-2 py-1 hidden sm:block"
            >
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 font-medium transition-colors"
            >
              Registrate gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">{children}</main>

      <footer className="mt-16 border-t border-slate-200/60 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div>© {new Date().getFullYear()} COMPLY360 — Compliance laboral peruano</div>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-slate-700">
              Términos
            </Link>
            <Link href="/privacidad" className="hover:text-slate-700">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
