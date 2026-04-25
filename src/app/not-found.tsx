import Link from 'next/link'
import { Home, ArrowLeft, Search, ArrowRight } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { BackButton } from '@/components/ui/back-button'

export const metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: false },
}

/**
 * Página 404 branded.
 *
 * Por qué esta versión vs el default de Next.js:
 *  - Respeta identidad Obsidian + Esmeralda
 *  - Ofrece 3 rutas útiles (no solo "volver al inicio")
 *  - Sugiere secciones populares para que el visitante no se vaya
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white flex flex-col">
      <header className="px-4 sm:px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-900 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
            C
          </span>
          <span>
            {BRAND.name.slice(0, 6)}
            <span className="text-emerald-600">{BRAND.name.slice(6)}</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Número 404 grande tipo editorial */}
          <div className="text-center mb-8">
            <p className="text-[120px] sm:text-[160px] font-bold leading-none bg-gradient-to-br from-emerald-500 to-emerald-700 bg-clip-text text-transparent tracking-tight">
              404
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Esta página no existe o se mudó de dirección
            </h1>
            <p className="mt-3 text-base text-slate-600 max-w-md mx-auto">
              Puede que el enlace esté desactualizado o que hayas escrito mal la URL. Tranqui —
              abajo hay rutas útiles para seguir.
            </p>
          </div>

          {/* CTAs principales */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Home className="w-4 h-4" />
              Volver al inicio
            </Link>
            <BackButton
              className="inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Página anterior
            </BackButton>
          </div>

          {/* Secciones populares */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm font-semibold uppercase tracking-wide">
              <Search className="w-4 h-4" />
              ¿Estabas buscando?
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  href: '/calculadoras',
                  title: 'Calculadoras',
                  desc: 'CTS, grati, multas SUNAFIL',
                },
                {
                  href: '/diagnostico-gratis',
                  title: 'Diagnóstico gratis',
                  desc: '2 min · 20 preguntas',
                },
                {
                  href: '/planes',
                  title: 'Planes y precios',
                  desc: 'Desde S/ 129/mes',
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl bg-slate-50 hover:bg-emerald-50 ring-1 ring-slate-200 hover:ring-emerald-200 p-4 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-xs text-slate-500">{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="px-4 sm:px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {BRAND.name} · comply360.pe
      </footer>
    </div>
  )
}
