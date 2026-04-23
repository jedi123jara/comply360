import Link from 'next/link'
import { WifiOff, RefreshCw, Home } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export const metadata = {
  title: 'Sin conexión',
  description: 'Comply360 necesita conexión a internet para sincronizar. Cuando estés online, vas a volver a ver todo al día.',
  robots: { index: false, follow: false },
}

/**
 * Página /offline — servida por el service worker (public/sw.js) cuando el
 * usuario pierde conexión y pide una ruta que no está cacheada.
 *
 * Sin JS del lado del cliente — solo HTML + CSS para que funcione incluso
 * en el peor escenario de red.
 */
export default function OfflinePage() {
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
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center mb-5">
            <WifiOff className="w-8 h-8 text-slate-400" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Estás sin conexión
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Comply360 necesita internet para sincronizar tus datos. Cuando vuelvas a estar online,
            todo se actualiza automáticamente — no perdés nada de lo que hiciste.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white ring-1 ring-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Link>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            Tip: si instalaste Comply360 en tu celular, podés usar el portal del trabajador
            offline para ver boletas ya descargadas.
          </p>
        </div>
      </main>

      <footer className="px-4 sm:px-6 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {BRAND.name}
      </footer>
    </div>
  )
}
