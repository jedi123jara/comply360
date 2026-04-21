import Link from 'next/link'
import { ChevronLeft, AlertTriangle, ShieldCheck } from 'lucide-react'

/**
 * LegalPage — layout compartido para páginas legales en Emerald Light.
 *
 * Marca prominente "DRAFT — pendiente de revisión legal" hasta que el abogado
 * firme la versión final. Así el admin que lee no se queda con la impresión
 * de que el contenido es definitivo antes de que esté certificado.
 */

export interface LegalPageProps {
  title: string
  subtitle?: string
  lastUpdated: string
  legalBasis?: string[]
  draft?: boolean
  children: React.ReactNode
}

export function LegalPage({
  title,
  subtitle,
  lastUpdated,
  legalBasis = [],
  draft = true,
  children,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-white">
      {/* Header emerald light */}
      <div
        className="border-b border-[color:var(--border-default)]"
        style={{
          background: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>

          <div className="inline-flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Documento legal · COMPLY360
            </span>
          </div>

          <h1
            className="text-4xl lg:text-5xl text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05 }}
          >
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 text-base text-[color:var(--text-secondary)] leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--text-tertiary)]">
            <span>Última actualización: {lastUpdated}</span>
            {legalBasis.length > 0 ? (
              <span>· Base legal: {legalBasis.join(', ')}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Draft notice */}
      {draft ? (
        <div className="border-b border-amber-200 bg-amber-50/50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Documento borrador (v0).</strong> Este contenido está pendiente de revisión y
              certificación por abogado laborista + datos personales. La versión final será
              publicada con indicación expresa.
            </p>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 prose prose-sm prose-emerald prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-lg prose-p:text-[color:var(--text-primary)] prose-p:leading-relaxed prose-li:text-[color:var(--text-primary)] prose-strong:text-[color:var(--text-primary)] prose-a:text-emerald-700 prose-a:no-underline hover:prose-a:underline">
        {children}
      </article>

      <div className="border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 text-xs text-[color:var(--text-tertiary)]">
          <p>
            ¿Dudas o consultas sobre este documento? Escribinos a{' '}
            <a href="mailto:datos@comply360.pe" className="text-emerald-700 hover:underline">
              datos@comply360.pe
            </a>{' '}
            · Para solicitudes de portabilidad o eliminación de datos (Ley 29733 Art. 22), usá los
            controles de tu perfil o escribinos.
          </p>
        </div>
      </div>
    </main>
  )
}
