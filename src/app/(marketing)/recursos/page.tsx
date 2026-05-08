import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, BookOpen, Clock } from 'lucide-react'
import { ARTICLES } from '@/lib/blog/articles'

export const metadata: Metadata = {
  title: 'Recursos · Guías de compliance laboral peruano · COMPLY360',
  description:
    'Guías prácticas sobre CTS, gratificaciones, multas SUNAFIL, régimen MYPE, contratos laborales y más. Contenido escrito por especialistas, actualizado 2026.',
}

export default function RecursosPage() {
  const sortedArticles = [...ARTICLES].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="border-b border-gray-100"
        style={{
          background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 group mb-6"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{
                background: 'linear-gradient(165deg, #1d4ed8 0%, #1e40af 55%, #1e3a8a 100%)',
              }}
            >
              <Shield className="h-4.5 w-4.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Comply<span className="text-emerald-700">360</span>
            </span>
          </Link>

          <div className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Recursos · Guías prácticas
            </span>
          </div>

          <h1
            className="text-4xl lg:text-6xl text-gray-900 mb-4"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05 }}
          >
            Todo lo que necesitas saber sobre{' '}
            <em className="italic text-emerald-700">compliance laboral peruano</em>.
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl">
            Guías escritas por especialistas en Derecho Laboral peruano. Actualizadas
            a 2026 con las últimas normas. Sin jerga innecesaria, con ejemplos reales.
          </p>
        </div>
      </div>

      {/* Articles grid */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {sortedArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/recursos/${article.slug}`}
              className="group rounded-2xl border border-gray-200 bg-white p-6 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {article.category}
              </div>
              <h2
                className="text-xl text-gray-900 mb-2 group-hover:text-emerald-800 transition-colors"
                style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, lineHeight: 1.2 }}
              >
                {article.title}
              </h2>
              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">
                {article.metaDescription}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {article.readMinutes} min
                </span>
                <span>·</span>
                <span>{new Date(article.publishedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA bottom */}
        <div
          className="mt-16 rounded-2xl p-8 text-center text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #172554 0%, #1e40af 50%, #2563eb 100%)',
          }}
        >
          <h3
            className="text-3xl mb-3"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.02em' }}
          >
            ¿Quieres pasar de leer a hacer?
          </h3>
          <p className="text-emerald-100 mb-5 max-w-xl mx-auto">
            Prueba el diagnóstico SUNAFIL gratis y sabé en 10 minutos cuánto podrías
            pagar en multas si te visitan mañana.
          </p>
          <Link
            href="/diagnostico-gratis"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-all"
          >
            Hacer diagnóstico gratis
          </Link>
        </div>
      </div>

      <footer className="py-10 bg-white border-t border-gray-100 text-center text-xs text-gray-500">
        <p>
          © {new Date().getFullYear()} COMPLY360 ·{' '}
          <Link href="/" className="hover:underline">Home</Link> ·{' '}
          <Link href="/terminos" className="hover:underline">Términos</Link> ·{' '}
          <Link href="/privacidad" className="hover:underline">Privacidad</Link>
        </p>
      </footer>
    </main>
  )
}
