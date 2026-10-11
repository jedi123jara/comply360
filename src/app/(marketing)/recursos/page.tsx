import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import { CtaBand } from '@/components/sitio/cta-band'
import { FichaHero, HeroPagina, Seccion } from '@/components/sitio/editorial'
import { JsonLd } from '@/components/sitio/json-ld'
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
  const temas = Array.from(new Set(articulos.map((a) => a.category)))
  const ultimaActualizacion = articulos.reduce((max, a) => (a.updatedAt > max ? a.updatedAt : max), '')

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

      <HeroPagina
        migas={[{ nombre: 'Recursos', ruta: '/recursos' }]}
        etiqueta="Recursos"
        titulo={
          <>
            Guías claras para <span className="text-[#F5B301]">cumplir sin adivinar</span>
          </>
        }
        bajada="Lo que exige la ley en SST, hostigamiento sexual y lo laboral, explicado con la norma en la mano y sin jerga."
        aside={
          <FichaHero
            filas={[
              { etiqueta: 'Guías', valor: `${articulos.length} artículos` },
              { etiqueta: 'Temas', valor: temas.join(', ') },
              ...(ultimaActualizacion ? [{ etiqueta: 'Actualizado', valor: fecha(ultimaActualizacion) }] : []),
            ]}
          />
        }
      />

      {/* 01 — Artículos */}
      <Seccion
        id="articulos"
        numero="01"
        etiqueta="Artículos"
        titulo="Todas las guías"
        bajada="De la más reciente a la más antigua."
      >
        <ol className="border-t border-[#0B1B36]">
          {articulos.map((a, i) => (
            <li key={a.slug} className="border-b border-[#E1E7F0]">
              <Link href={`/recursos/${a.slug}`} className="group grid grid-cols-[3rem_1fr_auto] gap-x-4 py-8">
                <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5A6A80]">{a.category}</p>
                  <h3 className="mt-2 max-w-3xl text-balance text-[1.4rem] font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36] sm:text-[1.55rem]">
                    {a.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-[1.02rem] leading-7 text-[#475569]">{a.metaDescription}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A6A80]">
                    <Clock aria-hidden className="h-3.5 w-3.5" />
                    {a.readMinutes} min de lectura · Actualizado el {fecha(a.updatedAt)}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 h-5 w-5 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                />
              </Link>
            </li>
          ))}
        </ol>
      </Seccion>

      <CtaBand
        titulo="¿Pasamos de leer a hacer?"
        texto="Haz el diagnóstico gratis y descubre qué le falta a tu empresa y cuánto arriesga en multas."
      />
    </>
  )
}
