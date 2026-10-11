import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, Info } from 'lucide-react'
import { pub } from '@/components/marketing/public-theme'
import { HeroPagina, Seccion } from '@/components/sitio/editorial'
import { JsonLd } from '@/components/sitio/json-ld'
import { cn } from '@/lib/utils'
import { ARTICLES, getAllSlugs, getArticleBySlug, type BlogBlock } from '@/lib/blog/articles'
import { articuloLd, construirMetadata } from '@/lib/sitio/seo'

// Solo existen los slugs del catálogo: cualquier otro responde 404 real (no soft 404).
export const dynamicParams = false

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) return { title: 'Artículo no encontrado' }

  const base = construirMetadata({
    titulo: article.title,
    descripcion: article.metaDescription,
    ruta: `/recursos/${article.slug}`,
    keywords: [article.keyword, 'Perú', 'SUNAFIL'],
    tipo: 'article',
  })
  return {
    ...base,
    // El título del artículo ya es largo: sin el sufijo de la marca.
    title: { absolute: article.title },
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
  }
}

function fecha(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  const ruta = `/recursos/${article.slug}`
  const relacionados = [
    ...ARTICLES.filter((a) => a.slug !== article.slug && a.category === article.category),
    ...ARTICLES.filter((a) => a.slug !== article.slug && a.category !== article.category),
  ].slice(0, 3)

  return (
    <>
      <JsonLd
        data={articuloLd({
          titulo: article.title,
          descripcion: article.metaDescription,
          ruta,
          publicado: article.publishedAt,
          actualizado: article.updatedAt,
        })}
      />

      <HeroPagina
        migas={[
          { nombre: 'Recursos', ruta: '/recursos' },
          { nombre: article.title, ruta },
        ]}
        etiqueta={article.category}
        titulo={article.title}
        bajada={article.metaDescription}
      >
        <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 border-t border-[#ffffff]/10 pt-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[#7C8BA3]">Lectura</dt>
            <dd className="mt-1 font-semibold text-[#ffffff]">{article.readMinutes} min</dd>
          </div>
          <div>
            <dt className="text-[#7C8BA3]">Actualizado</dt>
            <dd className="mt-1 font-semibold text-[#ffffff]">
              <time dateTime={article.updatedAt}>{fecha(article.updatedAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="text-[#7C8BA3]">Autor</dt>
            <dd className="mt-1 font-semibold text-[#ffffff]">{article.author}</dd>
          </div>
        </dl>
      </HeroPagina>

      <article className="bg-[#ffffff]">
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="space-y-6">
            {article.content.map((block, i) => (
              <RenderBlock key={i} block={block} />
            ))}
          </div>

          {article.cta ? (
            <aside aria-label="Para tu empresa" className="mt-16 rounded-2xl bg-[#0B1B36] p-8 text-[#ffffff] sm:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B301]">Para tu empresa</p>
              <p className="mt-4 text-balance text-2xl font-extrabold leading-tight tracking-[-0.025em] sm:text-[1.85rem]">
                ¿Quieres que lo veamos en tu empresa?
              </p>
              <p className="mt-3 max-w-xl text-[1.02rem] leading-7 text-[#CBD5E1]">
                Te ayudamos a cumplirlo y a dejar la evidencia lista para SUNAFIL.
              </p>
              <Link href={article.cta.href} className={cn(pub.btnPrimaryLg, 'mt-8')}>
                {article.cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </aside>
          ) : null}

          <p className="mt-12 border-t border-[#E1E7F0] pt-6 text-sm leading-6 text-[#5A6A80]">
            Este artículo es informativo y no reemplaza una asesoría sobre tu caso. Las normas pueden cambiar: revisa la
            fecha de actualización.
          </p>
        </div>
      </article>

      {relacionados.length > 0 ? (
        <Seccion id="relacionados" etiqueta="Recursos" tono="claro" titulo="Sigue leyendo">
          <ol className="border-t border-[#0B1B36]">
            {relacionados.map((r, i) => (
              <li key={r.slug} className="border-b border-[#D9E0EA]">
                <Link href={`/recursos/${r.slug}`} className="group grid grid-cols-[3rem_1fr_auto] gap-x-4 py-7">
                  <span className="pt-1 text-sm font-bold tabular-nums text-[#B45309]">{String(i + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5A6A80]">{r.category}</p>
                    <h3 className="mt-2 max-w-3xl text-balance text-[1.25rem] font-extrabold leading-snug tracking-[-0.02em] text-[#0B1B36]">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-xs font-semibold text-[#5A6A80]">{r.readMinutes} min de lectura</p>
                  </div>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-1 h-5 w-5 text-[#9AA6B8] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#0B1B36]"
                  />
                </Link>
              </li>
            ))}
          </ol>
          <Link href="/recursos" className={cn(pub.linkMore, 'mt-10 text-sm')}>
            Ver todas las guías <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Seccion>
      ) : null}

    </>
  )
}

const textoLectura = 'text-[1.08rem] leading-8 text-[#334155]'

function RenderBlock({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'p':
      return <p className={textoLectura}>{block.text}</p>
    case 'h2':
      return (
        <h2 className="pt-8 text-balance text-[1.6rem] font-extrabold leading-[1.2] tracking-[-0.025em] text-[#0B1B36] sm:text-[1.85rem]">
          {block.text}
        </h2>
      )
    case 'h3':
      return <h3 className="pt-3 text-[1.2rem] font-bold leading-snug tracking-[-0.01em] text-[#0B1B36]">{block.text}</h3>
    case 'ul':
      return (
        <ul className={cn(textoLectura, 'ml-5 list-outside list-disc space-y-2.5 marker:text-[#B45309]')}>
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              {item}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className={cn(textoLectura, 'ml-5 list-outside list-decimal space-y-2.5 marker:font-bold marker:text-[#B45309]')}>
          {block.items.map((item, i) => (
            <li key={i} className="pl-1">
              {item}
            </li>
          ))}
        </ol>
      )
    case 'quote':
      return (
        <blockquote className="my-10 border-l-2 border-[#F5B301] py-1 pl-6">
          <p className="text-[1.25rem] font-semibold leading-8 tracking-[-0.01em] text-[#0B1B36]">&ldquo;{block.text}&rdquo;</p>
          {block.cite ? (
            <cite className="mt-3 block text-[11px] font-bold uppercase not-italic tracking-[0.14em] text-[#5A6A80]">
              {block.cite}
            </cite>
          ) : null}
        </blockquote>
      )
    case 'callout': {
      const estilos = {
        info: { borde: 'border-[#2563EB]', icono: Info, color: 'text-[#2563EB]' },
        warning: { borde: 'border-[#F5B301]', icono: AlertTriangle, color: 'text-[#B45309]' },
        success: { borde: 'border-[#15803D]', icono: CheckCircle2, color: 'text-[#15803D]' },
      }[block.variant]
      const Icono = estilos.icono
      return (
        <div className={cn('flex items-start gap-3 border-l-2 bg-[#F5F7FB] py-5 pl-5 pr-6', estilos.borde)}>
          <Icono aria-hidden className={cn('mt-1 h-5 w-5 shrink-0', estilos.color)} />
          <div className="text-[0.98rem] leading-7 text-[#0B1B36]">
            {block.title ? <strong className="mb-1 block font-extrabold">{block.title}</strong> : null}
            {block.text}
          </div>
        </div>
      )
    }
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-xl bg-[#0B1B36] p-5 text-sm leading-relaxed text-[#E2E8F0]">
          <code className="font-mono">{block.text}</code>
        </pre>
      )
    default:
      return null
  }
}
