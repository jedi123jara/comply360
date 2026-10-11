import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { PublicHero } from '@/components/marketing/public-hero'
import { pub } from '@/components/marketing/public-theme'
import { Breadcrumbs } from '@/components/sitio/breadcrumbs'
import { CtaBand } from '@/components/sitio/cta-band'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
import { ARTICLES } from '@/lib/blog/articles'
import { construirMetadata } from '@/lib/sitio/seo'
import { SITE_URL } from '@/lib/sitio/site'

export const metadata: Metadata = construirMetadata({
  titulo: 'Guías de cumplimiento laboral y SST',
  descripcion:
    'Guías prácticas sobre capacitaciones obligatorias, comité de SST, hostigamiento sexual, cuadro de categorías, multas SUNAFIL, CTS y régimen MYPE, actualizadas a 2026.',
  ruta: '/recursos',
  keywords: ['guías laborales Perú', 'obligaciones SST', 'hostigamiento sexual empleador', 'multas SUNAFIL 2026', 'blog laboral'],
})

function fecha(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RecursosPage() {
  const articulos = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'Recursos de Comply360',
          url: `${SITE_URL}/recursos`,
          inLanguage: 'es-PE',
          blogPost: articulos.map((a) => ({
            '@type': 'BlogPosting',
            headline: a.title,
            url: `${SITE_URL}/recursos/${a.slug}`,
            datePublished: a.publishedAt,
            dateModified: a.updatedAt,
          })),
        }}
      />
      <PublicHero
        align="left"
        eyebrow="Recursos"
        title={
          <>
            Guías claras para <span className={pub.highlightOnNavy}>cumplir sin adivinar</span>
          </>
        }
        description="Lo que exige la ley en SST, hostigamiento sexual y lo laboral, explicado con la norma en la mano y sin jerga."
        media={<Breadcrumbs items={[{ nombre: 'Recursos', ruta: '/recursos' }]} className="mb-0" />}
      />

      <section aria-label="Artículos">
        <div className={cn(pub.container, pub.section)}>
          <div className="grid gap-5 md:grid-cols-2">
            {articulos.map((a) => (
              <Link key={a.slug} href={`/recursos/${a.slug}`} className={cn(pub.card, pub.cardHover, 'flex flex-col p-6')}>
                <p className={pub.kicker}>{a.category}</p>
                <h2 className="mt-2 text-xl font-extrabold leading-snug tracking-[-0.01em] text-[#0B1B36]">{a.title}</h2>
                <p className={cn(pub.body, 'mt-2 flex-1')}>{a.metaDescription}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={cn(pub.faint, 'inline-flex items-center gap-1.5')}>
                    <Clock aria-hidden className="h-3.5 w-3.5" />
                    {a.readMinutes} min · {fecha(a.updatedAt)}
                  </span>
                  <span className={cn(pub.linkMore, 'text-sm')}>
                    Leer <ArrowRight aria-hidden className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        titulo="¿Pasamos de leer a hacer?"
        texto="Haz el diagnóstico gratis y descubre qué le falta a tu empresa y cuánto arriesga en multas."
      />
    </>
  )
}
